import type { Node } from '@xyflow/react';
import type { Prisma } from '@prisma/client';
import { logger, task, tasks } from '@trigger.dev/sdk/v3';
import { AppError, toAppError } from '@/lib/api-errors';
import { executeWorkflow, type NodeIOMap, type NodeRunRecord } from '@/lib/workflow-engine';
import { sanitizeForPersistence } from '@/lib/run-sanitization';
import type { WorkflowOrchestratorPayload } from '@/lib/run-types';

const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro']);

function parseNumberInput(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function validatePercent(name: string, value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new AppError('invalid_input', `${name} must be between 0 and 100.`, 400, { field: name, value });
  }
  return value;
}

function validateTimestamp(timestamp: string): string {
  const value = timestamp.trim();
  if (!value) return '0';

  const isPercent = /^\d+(?:\.\d+)?%$/.test(value);
  const isSeconds = /^\d+(?:\.\d+)?(?:s)?$/i.test(value);

  if (!isPercent && !isSeconds) {
    throw new AppError('invalid_input', 'Timestamp must be seconds (e.g. 5 or 5s) or percentage (e.g. 50%).', 400, {
      field: 'timestamp',
      value,
    });
  }

  return value;
}

function composeTextInput(value: unknown, label: string): string {
  if (Array.isArray(value)) {
    const entries = value
      .map((item, index) => `[${label} ${index + 1}]\n${String(item ?? '').trim()}`)
      .filter((entry) => entry.trim() !== `[${label} 1]`);
    return entries.join('\n\n');
  }
  return String(value ?? '').trim();
}

function normalizeMediaInput(value: unknown, field: string): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  const media = String(candidate ?? '').trim();
  if (!media) {
    throw new AppError('invalid_input', `${field} is required.`, 400, { field });
  }
  if (media.startsWith('blob:')) {
    throw new AppError(
      'invalid_input',
      `${field} uses an in-browser blob URL, which cannot be processed by Trigger.dev. Upload the file and use a URL or data URL.`,
      400,
      { field }
    );
  }
  return media;
}

function extractTaskErrorMessage(error: unknown, fallback: string): string {
  if (!error) return fallback;
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object') {
    const value = error as Record<string, unknown>;
    if (typeof value.message === 'string' && value.message.trim()) {
      return value.message.trim();
    }
  }
  return fallback;
}

async function getDb() {
  return import('@/lib/prisma');
}

function buildLlmPayload(node: Node, inputs: NodeIOMap): {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  images: string[];
} {
  const data = node.data ?? {};

  const requestedModel = String(data.model ?? 'gemini-2.5-flash').toLowerCase();
  if (!ALLOWED_MODELS.has(requestedModel)) {
    throw new AppError('invalid_input', `Model "${requestedModel}" is not allowed. Use Gemini 2.5 Flash or Gemini 2.5 Pro.`, 400, {
      field: 'model',
      allowed: [...ALLOWED_MODELS],
    });
  }

  const userMessageRaw = composeTextInput(inputs.user_message ?? data.userMessage ?? '', 'User Input');
  if (!userMessageRaw) {
    throw new AppError('invalid_input', 'LLM node requires a user message.', 400, {
      nodeId: node.id,
      field: 'user_message',
    });
  }

  const systemPromptRaw = composeTextInput(inputs.system_prompt ?? data.systemPrompt ?? '', 'System Input');

  let images: string[] = [];
  if (Array.isArray(inputs.images)) {
    images = inputs.images.map(String).filter(Boolean);
  } else if (inputs.images) {
    images = [String(inputs.images)];
  } else {
    images = String(data.imagesInput ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const normalizedImages = images.map((image) => normalizeMediaInput(image, 'images'));

  return {
    model: requestedModel,
    systemPrompt: systemPromptRaw || undefined,
    userMessage: userMessageRaw,
    images: normalizedImages,
  };
}

async function getPersistedOutputs(workflowId: string): Promise<Record<string, NodeIOMap>> {
  const { prisma, withRetry } = await getDb();
  const executions = await withRetry(() =>
    prisma.nodeExecution.findMany({
      where: {
        status: 'success',
        run: {
          workflowId,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
    })
  );

  const map: Record<string, NodeIOMap> = {};
  for (const execution of executions) {
    if (map[execution.nodeId]) continue;
    const outputs = execution.outputs;
    if (outputs && typeof outputs === 'object' && !Array.isArray(outputs)) {
      map[execution.nodeId] = outputs as NodeIOMap;
    }
  }
  return map;
}

function statusFromNodeRun(status: NodeRunRecord['status']): 'success' | 'failed' | 'running' | 'queued' {
  if (status === 'success') return 'success';
  if (status === 'queued') return 'queued';
  if (status === 'running') return 'running';
  return 'failed';
}

type NodeExecutionMeta = {
  triggerRunId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export const orchestrateWorkflowRunTask = task({
  id: 'orchestrate-workflow-run',
  queue: {
    name: 'nextflow-orchestrator',
    concurrencyLimit: 25,
  },
  retry: {
    maxAttempts: 1,
  },
  maxDuration: 300,
  run: async (payload: WorkflowOrchestratorPayload, { ctx }) => {
    const { prisma, withRetry } = await getDb();

    logger.info('Starting workflow orchestration', {
      runId: payload.runId,
      workflowId: payload.workflowId,
      nodeCount: payload.nodes.length,
      edgeCount: payload.edges.length,
      scope: payload.scope,
      triggerRunId: ctx.run.id,
    });

    const startedAtMs = Date.now();

    await withRetry(() =>
      prisma.workflowRun.update({
        where: { id: payload.runId },
        data: {
          status: 'running',
          triggerRunId: ctx.run.id,
          triggerStatus: 'EXECUTING',
          startedAt: new Date(),
        },
      })
    );

    const persistedOutputsByNodeId = payload.scope === 'full' ? {} : await getPersistedOutputs(payload.workflowId);

    for (const node of payload.nodes) {
      if (node.type === 'text') {
        persistedOutputsByNodeId[node.id] = {
          ...persistedOutputsByNodeId[node.id],
          output: String(node.data?.value ?? ''),
        };
      } else if (node.type === 'image' && node.data?.imageUrl) {
        persistedOutputsByNodeId[node.id] = {
          ...persistedOutputsByNodeId[node.id],
          image_url: normalizeMediaInput(node.data.imageUrl, 'imageUrl'),
        };
      } else if (node.type === 'video' && node.data?.videoUrl) {
        persistedOutputsByNodeId[node.id] = {
          ...persistedOutputsByNodeId[node.id],
          video_url: normalizeMediaInput(node.data.videoUrl, 'videoUrl'),
        };
      }
    }

    const executionByNodeId = new Map<string, string>();
    const nodeTypeById = new Map(payload.nodes.map((node) => [node.id, node.type ?? 'unknown']));
    const nodeMetaById = new Map<string, NodeExecutionMeta>();
    const nodeRuns: NodeRunRecord[] = [];

    const executeNode = async (node: Node, inputs: NodeIOMap): Promise<NodeIOMap> => {
      if (node.type === 'text') {
        return { output: String(node.data?.value ?? '') };
      }

      if (node.type === 'image') {
        return { image_url: normalizeMediaInput(node.data?.imageUrl, 'imageUrl') };
      }

      if (node.type === 'video') {
        return { video_url: normalizeMediaInput(node.data?.videoUrl, 'videoUrl') };
      }

      if (node.type === 'llm') {
        const llmPayload = buildLlmPayload(node, inputs);
        const llmRun = await tasks.triggerAndWait('run-llm', llmPayload, {
          maxAttempts: 1,
          maxDuration: 180,
          tags: [
            `workflow:${payload.workflowId}`,
            `run:${payload.runId}`,
            `node:${node.id}`,
            'nodeType:llm',
          ],
        });

        nodeMetaById.set(node.id, { triggerRunId: llmRun.id });

        if (!llmRun.ok) {
          const message = extractTaskErrorMessage(llmRun.error, 'run-llm failed in Trigger.dev.');
          nodeMetaById.set(node.id, {
            triggerRunId: llmRun.id,
            errorCode: 'trigger_task_failed',
            errorMessage: message,
          });
          throw new AppError('task_failed', message, 502, {
            nodeId: node.id,
            task: 'run-llm',
            runId: llmRun.id,
          });
        }

        return { output: llmRun.output?.response ?? '' };
      }

      if (node.type === 'crop') {
        const data = node.data ?? {};
        const cropPayload = {
          imageUrl: normalizeMediaInput(inputs.image_url ?? data.imageUrl, 'image_url'),
          x: validatePercent('x_percent', parseNumberInput(inputs.x_percent ?? data.x_percent, 0)),
          y: validatePercent('y_percent', parseNumberInput(inputs.y_percent ?? data.y_percent, 0)),
          w: validatePercent('width_percent', parseNumberInput(inputs.width_percent ?? data.width_percent, 100)),
          h: validatePercent('height_percent', parseNumberInput(inputs.height_percent ?? data.height_percent, 100)),
        };

        const cropRun = await tasks.triggerAndWait('crop-image', cropPayload, {
          maxAttempts: 1,
          maxDuration: 180,
          tags: [
            `workflow:${payload.workflowId}`,
            `run:${payload.runId}`,
            `node:${node.id}`,
            'nodeType:crop',
          ],
        });

        nodeMetaById.set(node.id, { triggerRunId: cropRun.id });

        if (!cropRun.ok) {
          const message = extractTaskErrorMessage(cropRun.error, 'crop-image failed in Trigger.dev.');
          nodeMetaById.set(node.id, {
            triggerRunId: cropRun.id,
            errorCode: 'trigger_task_failed',
            errorMessage: message,
          });
          throw new AppError('task_failed', message, 502, {
            nodeId: node.id,
            task: 'crop-image',
            runId: cropRun.id,
          });
        }

        const output = String(cropRun.output?.croppedUrl ?? '').trim();
        if (!output) {
          throw new AppError('task_failed', 'Crop task returned no output URL.', 502, { nodeId: node.id });
        }

        return { output, image_url: output };
      }

      if (node.type === 'extract') {
        const data = node.data ?? {};
        const extractPayload = {
          videoUrl: normalizeMediaInput(inputs.video_url ?? data.videoUrl, 'video_url'),
          timestamp: validateTimestamp(String(inputs.timestamp ?? data.timestamp ?? '0')),
        };

        const extractRun = await tasks.triggerAndWait('extract-frame', extractPayload, {
          maxAttempts: 1,
          maxDuration: 180,
          tags: [
            `workflow:${payload.workflowId}`,
            `run:${payload.runId}`,
            `node:${node.id}`,
            'nodeType:extract',
          ],
        });

        nodeMetaById.set(node.id, { triggerRunId: extractRun.id });

        if (!extractRun.ok) {
          const message = extractTaskErrorMessage(extractRun.error, 'extract-frame failed in Trigger.dev.');
          nodeMetaById.set(node.id, {
            triggerRunId: extractRun.id,
            errorCode: 'trigger_task_failed',
            errorMessage: message,
          });
          throw new AppError('task_failed', message, 502, {
            nodeId: node.id,
            task: 'extract-frame',
            runId: extractRun.id,
          });
        }

        const output = String(extractRun.output?.frameUrl ?? '').trim();
        if (!output) {
          throw new AppError('task_failed', 'Extract frame task returned no frame URL.', 502, { nodeId: node.id });
        }

        return { output, image_url: output, frame_url: output };
      }

      throw new AppError('invalid_input', `Unsupported node type "${node.type}".`, 400, { nodeId: node.id, type: node.type });
    };

    try {
      const result = await executeWorkflow({
        nodes: payload.nodes,
        edges: payload.edges,
        selectedNodeIds: payload.selectedNodeIds,
        persistedOutputsByNodeId,
        executeNode,
        onNodeStart: async (nodeId, inputs) => {
          const execution = await withRetry(() =>
            prisma.nodeExecution.create({
              data: {
                runId: payload.runId,
                nodeId,
                nodeType: nodeTypeById.get(nodeId) ?? 'unknown',
                status: 'running',
                inputs: sanitizeForPersistence(inputs) as Prisma.InputJsonValue,
                metadata: {
                  orchestratorRunId: ctx.run.id,
                } as Prisma.InputJsonValue,
              },
            })
          );
          executionByNodeId.set(nodeId, execution.id);
        },
        onNodeFinish: async (record) => {
          nodeRuns.push(record);
          const executionId = executionByNodeId.get(record.nodeId);
          if (!executionId) return;

          const meta = nodeMetaById.get(record.nodeId);
          await withRetry(() =>
            prisma.nodeExecution.update({
              where: { id: executionId },
              data: {
                nodeType: record.type,
                status: statusFromNodeRun(record.status),
                outputs: sanitizeForPersistence(record.outputs) as Prisma.InputJsonValue,
                error: record.error ?? meta?.errorMessage ?? null,
                errorCode: record.status === 'error' ? meta?.errorCode ?? 'node_execution_failed' : null,
                duration: new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime(),
                triggerRunId: meta?.triggerRunId ?? null,
              },
            })
          );
        },
      });

      const duration = Date.now() - startedAtMs;
      await withRetry(() =>
        prisma.workflowRun.update({
          where: { id: payload.runId },
          data: {
            status: 'success',
            triggerStatus: 'COMPLETED',
            duration,
            finishedAt: new Date(),
            errorCode: null,
            errorMessage: null,
          },
        })
      );

      logger.info('Workflow orchestration completed', {
        runId: payload.runId,
        workflowId: payload.workflowId,
        duration,
        executedNodes: result.nodeRuns.length,
      });

      return {
        runId: payload.runId,
        status: 'success',
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startedAtMs;
      const hasSuccess = nodeRuns.some((entry) => entry.status === 'success');
      const appError = toAppError(error, 'Workflow execution failed');
      const nextStatus = hasSuccess ? 'partial' : 'failed';

      await withRetry(() =>
        prisma.workflowRun.update({
          where: { id: payload.runId },
          data: {
            status: nextStatus,
            triggerStatus: 'FAILED',
            duration,
            finishedAt: new Date(),
            errorCode: appError.code,
            errorMessage: appError.message,
          },
        })
      );

      logger.error('Workflow orchestration failed', {
        runId: payload.runId,
        workflowId: payload.workflowId,
        duration,
        error: appError.message,
        code: appError.code,
      });

      throw error;
    }
  },
});
