import type { Edge, Node } from '@xyflow/react';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { runs, tasks } from '@trigger.dev/sdk/v3';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { executeWorkflow, type NodeRunRecord, type NodeIOMap } from '@/lib/workflow-engine';
import { executeNode as executeNodeLocal } from '@/lib/node-executor';
import { AppError, toAppError } from '@/lib/api-errors';

type RunBody = {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  scope: 'full' | 'partial' | 'single';
};

type DependencyState = {
  database: 'ok' | 'unavailable';
  trigger: 'ok' | 'unavailable' | 'not_required';
  gemini: 'ok' | 'unavailable' | 'not_required';
};

type TriggerRunErrorShape = {
  message?: string;
  name?: string;
  stackTrace?: string;
  [key: string]: unknown;
};

const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.5-pro']);
const FORCE_TRIGGER_ONLY = process.env.NEXTFLOW_FORCE_TRIGGER_ONLY === 'true';
const ALLOW_LOCAL_FALLBACK =
  (process.env.NEXTFLOW_ALLOW_LOCAL_FALLBACK ?? (process.env.NODE_ENV === 'production' ? 'false' : 'true')) === 'true';

function isNodeDisabled(node: Node): boolean {
  return Boolean(node.data?.disabled);
}

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

  return {
    model: requestedModel,
    systemPrompt: systemPromptRaw || undefined,
    userMessage: userMessageRaw,
    images,
  };
}

function getIncludedGraph(body: RunBody): { nodes: Node[]; edges: Edge[] } {
  const enabledNodes = body.nodes.filter((node) => !isNodeDisabled(node));
  const enabledNodeIds = new Set(enabledNodes.map((node) => node.id));
  const enabledEdges = body.edges.filter((edge) => enabledNodeIds.has(edge.source) && enabledNodeIds.has(edge.target));

  if (body.selectedNodeIds?.length) {
    const selected = new Set(body.selectedNodeIds.filter((nodeId) => enabledNodeIds.has(nodeId)));
    return {
      nodes: enabledNodes.filter((node) => selected.has(node.id)),
      edges: enabledEdges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)),
    };
  }

  if (enabledEdges.length === 0) {
    return { nodes: enabledNodes, edges: enabledEdges };
  }

  const connectedNodeIds = new Set<string>();
  for (const edge of enabledEdges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  return {
    nodes: enabledNodes.filter((node) => connectedNodeIds.has(node.id)),
    edges: enabledEdges,
  };
}

async function getPersistedOutputs(workflowId: string): Promise<Record<string, NodeIOMap>> {
  const executions = await withRetry(() => prisma.nodeExecution.findMany({
    where: {
      status: 'success',
      run: {
        workflowId,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 1000,
  }));

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

function ensureDependencies(_body: RunBody, includedNodes: Node[]): DependencyState {
  const hasTriggerNodes = includedNodes.some((node) => node.type === 'llm' || node.type === 'crop' || node.type === 'extract');
  const hasLlmNodes = includedNodes.some((node) => node.type === 'llm');

  const dependencies: DependencyState = {
    database: 'ok',
    trigger: hasTriggerNodes ? 'ok' : 'not_required',
    gemini: hasLlmNodes ? 'ok' : 'not_required',
  };

  if (hasTriggerNodes && !process.env.TRIGGER_SECRET_KEY && (!ALLOW_LOCAL_FALLBACK || FORCE_TRIGGER_ONLY)) {
    dependencies.trigger = 'unavailable';
    throw new AppError('dependency_unavailable', 'Trigger.dev is not configured. Missing TRIGGER_SECRET_KEY.', 503, {
      dependencies,
    });
  }

  if (hasLlmNodes && !process.env.GEMINI_API_KEY) {
    dependencies.gemini = 'unavailable';
    throw new AppError('dependency_unavailable', 'Gemini API key is missing. Configure GEMINI_API_KEY.', 503, {
      dependencies,
    });
  }

  return dependencies;
}

function isRecoverableTriggerError(error: unknown): boolean {
  if (!(error instanceof AppError)) return false;
  if (error.code === 'dependency_unavailable') return true;
  if (error.code === 'task_failed') return true;
  return false;
}

function createErrorResponse(error: unknown, dependencies?: Partial<DependencyState>) {
  const appError = toAppError(error, 'Workflow run failed');
  const payload = {
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details,
    },
    dependencies: {
      database: appError.code === 'dependency_unavailable' && appError.details?.dependency === 'database' ? 'unavailable' : 'ok',
      trigger: dependencies?.trigger ?? 'ok',
      gemini: dependencies?.gemini ?? 'ok',
    },
  };

  return NextResponse.json(payload, { status: appError.status });
}

function extractTriggerRunErrorMessage(error: unknown): string | null {
  if (!error) return null;

  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || null;
  }

  if (typeof error === 'object') {
    const candidate = error as TriggerRunErrorShape;

    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }

    if (Array.isArray((candidate as { issues?: unknown[] }).issues)) {
      const messages = ((candidate as { issues?: unknown[] }).issues ?? [])
        .map((issue) => extractTriggerRunErrorMessage(issue))
        .filter((message): message is string => Boolean(message));

      if (messages.length > 0) {
        return messages.join(' | ');
      }
    }
  }

  return null;
}

async function triggerTaskAndPoll<TOutput = unknown>(taskId: string, payload: unknown): Promise<TOutput> {
  if (!process.env.TRIGGER_SECRET_KEY) {
    throw new AppError('dependency_unavailable', `Trigger.dev is not configured for ${taskId}.`, 503, {
      task: taskId,
      hint: 'Set TRIGGER_SECRET_KEY or enable local fallback.',
    });
  }

  const handle = await tasks.trigger(taskId, payload);
  const timeoutMs = Number(process.env.TRIGGER_POLL_TIMEOUT_MS ?? 45000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 5000) {
    throw new AppError('invalid_input', 'TRIGGER_POLL_TIMEOUT_MS must be a number >= 5000.', 500, {
      value: process.env.TRIGGER_POLL_TIMEOUT_MS,
    });
  }
  const pollIntervalMs = Number(process.env.TRIGGER_POLL_INTERVAL_MS ?? 500);
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < 250) {
    throw new AppError('invalid_input', 'TRIGGER_POLL_INTERVAL_MS must be a number >= 250.', 500, {
      value: process.env.TRIGGER_POLL_INTERVAL_MS,
    });
  }

  const safePollIntervalMs = Math.min(pollIntervalMs, Math.max(250, timeoutMs - 250));
  const pollPromise = runs.poll(handle.id, { pollIntervalMs: safePollIntervalMs });
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(
        new AppError(
          'dependency_unavailable',
          `Timed out waiting for ${taskId}. Trigger worker may be unavailable.`,
          503,
          {
            task: taskId,
            runId: handle.id,
            timeoutMs,
            hint: 'Start the Trigger worker with: npx trigger.dev@latest dev',
          }
        )
      );
    }, timeoutMs);
  });

  const run = await Promise.race([pollPromise, timeoutPromise]);

  if (!run.isSuccess) {
    const triggerErrorMessage = extractTriggerRunErrorMessage(run.error);

    throw new AppError('task_failed', triggerErrorMessage ?? `${taskId} failed in Trigger.dev.`, 502, {
      task: taskId,
      runId: handle.id,
      status: run.status,
      error: run.error,
      source: 'trigger.dev',
    });
  }

  return run.output as TOutput;
}

export async function POST(request: NextRequest) {
  let dependencies: Partial<DependencyState> = {
    database: 'ok',
    trigger: 'ok',
    gemini: 'ok',
  };

  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    const body = (await request.json()) as RunBody;
    if (!body.workflowId || !Array.isArray(body.nodes) || !Array.isArray(body.edges) || !body.scope) {
      throw new AppError('bad_request', 'Invalid run payload.', 400);
    }

    const { user } = await ensureUserAndWorkflow(userId);

    const workflow = await withRetry(() => prisma.workflow.findFirst({
      where: { id: body.workflowId, userId: user.id },
    }));
    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    const includedGraph = getIncludedGraph(body);
    if (includedGraph.nodes.length === 0) {
      throw new AppError('invalid_input', 'No executable nodes found for this run.', 400);
    }

    dependencies = ensureDependencies(body, includedGraph.nodes);

    const run = await withRetry(() => prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        status: 'running',
        scope: body.scope,
      },
    }));

    const persistedOutputsByNodeId = body.scope === 'full' ? {} : await getPersistedOutputs(workflow.id);

    // High-performance optimization: pre-populate outputs for static nodes (text, image, video)
    // from their current data. This allows downstream nodes to run even if the static node 
    // hasn't been explicitly "executed" yet in a previous run.
    for (const node of body.nodes) {
      if (node.type === 'text') {
        persistedOutputsByNodeId[node.id] = { 
          ...persistedOutputsByNodeId[node.id], 
          output: String(node.data?.value ?? '') 
        };
      } else if (node.type === 'image' && node.data?.imageUrl) {
        persistedOutputsByNodeId[node.id] = { 
          ...persistedOutputsByNodeId[node.id], 
          image_url: String(node.data.imageUrl) 
        };
      } else if (node.type === 'video' && node.data?.videoUrl) {
        persistedOutputsByNodeId[node.id] = { 
          ...persistedOutputsByNodeId[node.id], 
          video_url: String(node.data.videoUrl) 
        };
      }
    }

    const executionByRecordId = new Map<string, string>();
    const nodeTypeById = new Map(body.nodes.map((node) => [node.id, node.type ?? 'unknown']));
    const nodeRuns: NodeRunRecord[] = [];
    const startedAt = Date.now();
    const fallbackNodeIds = new Set<string>();

    const executeNode = async (node: Node, inputs: NodeIOMap): Promise<NodeIOMap> => {
      // High-performance path: Try local execution first for immediate response (< 3s)
      if (ALLOW_LOCAL_FALLBACK) {
        try {
          return await executeNodeLocal(node, inputs);
        } catch (localError) {
          console.warn(`Local execution failed for ${node.id}, falling back to Trigger.dev:`, localError);
        }
      }

      const runWithFallback = async <T>(taskName: string, fn: () => Promise<T>): Promise<T> => {
        try {
          return await fn();
        } catch (error) {
          throw error;
        }
      };

      if (node.type === 'llm') {
        return runWithFallback('run-llm', async () => {
          const payload = buildLlmPayload(node, inputs);
          const result = await triggerTaskAndPoll<{ response?: string }>('run-llm', payload);
          return { output: result?.response ?? '' };
        });
      }

      if (node.type === 'crop') {
        return runWithFallback('crop-image', async () => {
          const data = node.data ?? {};
          const imageUrl = String(inputs.image_url ?? data.imageUrl ?? '');
          if (!imageUrl) {
            throw new AppError('invalid_input', 'Crop node requires image_url.', 400, { nodeId: node.id });
          }

          const payload = {
            imageUrl,
            x: validatePercent('x_percent', parseNumberInput(inputs.x_percent ?? data.x_percent, 0)),
            y: validatePercent('y_percent', parseNumberInput(inputs.y_percent ?? data.y_percent, 0)),
            w: validatePercent('width_percent', parseNumberInput(inputs.width_percent ?? data.width_percent, 100)),
            h: validatePercent('height_percent', parseNumberInput(inputs.height_percent ?? data.height_percent, 100)),
          };

          const result = await triggerTaskAndPoll<{ croppedUrl?: string }>('crop-image', payload);
          const output = result?.croppedUrl;
          if (!output) {
            throw new AppError('task_failed', 'Crop task returned no output URL.', 502, { nodeId: node.id });
          }

          return { output };
        });
      }

      if (node.type === 'extract') {
        return runWithFallback('extract-frame', async () => {
          const data = node.data ?? {};
          const videoUrl = String(inputs.video_url ?? data.videoUrl ?? '');
          if (!videoUrl) {
            throw new AppError('invalid_input', 'Extract node requires video_url.', 400, { nodeId: node.id });
          }

          const payload = {
            videoUrl,
            timestamp: validateTimestamp(String(inputs.timestamp ?? data.timestamp ?? '0')),
          };

          const result = await triggerTaskAndPoll<{ frameUrl?: string }>('extract-frame', payload);
          const output = result?.frameUrl;
          if (!output) {
            throw new AppError('task_failed', 'Extract frame task returned no frame URL.', 502, { nodeId: node.id });
          }

          return { output };
        });
      }

      return executeNodeLocal(node, inputs);
    };

    try {
      const result = await executeWorkflow({
        nodes: body.nodes,
        edges: body.edges,
        selectedNodeIds: body.selectedNodeIds,
        persistedOutputsByNodeId,
        executeNode,
        onNodeStart: async (nodeId, inputs) => {
          const execution = await withRetry(() => prisma.nodeExecution.create({
            data: {
              runId: run.id,
              nodeId,
              nodeType: nodeTypeById.get(nodeId) ?? 'unknown',
              status: 'running',
              inputs: (inputs ?? {}) as Prisma.InputJsonValue,
            },
          }));
          executionByRecordId.set(nodeId, execution.id);
        },
        onNodeFinish: async (record) => {
          nodeRuns.push(record);
          const executionId = executionByRecordId.get(record.nodeId);
          if (!executionId) return;

          await withRetry(() => prisma.nodeExecution.update({
            where: { id: executionId },
            data: {
              nodeType: record.type,
              status: record.status === 'error' ? 'failed' : 'success',
              outputs: (record.outputs ?? {}) as Prisma.InputJsonValue,
              error: record.error ?? null,
              duration: new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime(),
            },
          }));
        },
      });

      const duration = Date.now() - startedAt;
      await withRetry(() => prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: 'success',
          duration,
        },
      }));

      return NextResponse.json({
        run: {
          id: run.id,
          status: 'success',
          scope: body.scope,
          duration,
          startedAt: run.createdAt.toISOString(),
          finishedAt: new Date().toISOString(),
          nodeRuns,
          executionPath: result.executionPath,
        },
        dependencies,
        fallback: {
          used: fallbackNodeIds.size > 0,
          nodeIds: [...fallbackNodeIds],
          mode: ALLOW_LOCAL_FALLBACK && !FORCE_TRIGGER_ONLY ? 'local-executor' : 'none',
        },
      });
    } catch (error) {
      const duration = Date.now() - startedAt;
      const hasSuccess = nodeRuns.some((entry) => entry.status === 'success');
      await withRetry(() => prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: hasSuccess ? 'partial' : 'failed',
          duration,
        },
      }));

      return createErrorResponse(error, dependencies);
    }
  } catch (error) {
    return createErrorResponse(error, dependencies);
  }
}
