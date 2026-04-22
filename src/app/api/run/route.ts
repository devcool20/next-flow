import type { Edge, Node } from '@xyflow/react';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { tasks } from '@trigger.dev/sdk/v3';
import { prisma } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { executeWorkflow, type NodeRunRecord } from '@/lib/workflow-engine';
import { executeNode as executeNodeLocal } from '@/lib/node-executor';
import type { NodeIOMap } from '@/lib/workflow-engine';

type RunBody = {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  scope: 'full' | 'partial' | 'single';
};

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as RunBody;
  const { user } = await ensureUserAndWorkflow(userId);

  const workflow = await prisma.workflow.findFirst({
    where: { id: body.workflowId, userId: user.id },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const run = await prisma.workflowRun.create({
    data: {
      workflowId: workflow.id,
      status: 'running',
      scope: body.scope,
    },
  });

  const executionByNodeId = new Map<string, string>();
  const nodeTypeById = new Map(body.nodes.map((node) => [node.id, node.type ?? 'unknown']));
  const nodeRuns: NodeRunRecord[] = [];
  const startedAt = Date.now();

  try {
    const executeNode = async (node: Node, inputs: NodeIOMap): Promise<NodeIOMap> => {
      if (node.type === 'llm') {
        const data = node.data ?? {};
        const payload = {
          model: String(data.model ?? 'gemini-2.5-flash'),
          systemPrompt: String(inputs.system_prompt ?? data.systemPrompt ?? ''),
          userMessage: String(inputs.user_message ?? data.userMessage ?? ''),
          images: Array.isArray(inputs.images)
            ? inputs.images.map(String)
            : inputs.images
              ? [String(inputs.images)]
              : String(data.imagesInput ?? '')
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
        };

        try {
          const result = await tasks.triggerAndWait('run-llm', payload);
          if (result.ok) {
            return { output: (result.output as { response?: string })?.response ?? '' };
          }
        } catch {
          // Fall back to local executor in dev/prototype environments.
        }
        return executeNodeLocal(node, inputs);
      }

      if (node.type === 'crop') {
        const data = node.data ?? {};
        const imageUrl = String(inputs.image_url ?? data.imageUrl ?? '');
        const payload = {
          imageUrl,
          x: Number(inputs.x_percent ?? data.x_percent ?? 0),
          y: Number(inputs.y_percent ?? data.y_percent ?? 0),
          w: Number(inputs.width_percent ?? data.width_percent ?? 100),
          h: Number(inputs.height_percent ?? data.height_percent ?? 100),
        };

        try {
          const result = await tasks.triggerAndWait('crop-image', payload);
          if (result.ok) {
            const output = (result.output as { croppedUrl?: string })?.croppedUrl;
            return { output: output ?? '' };
          }
        } catch {
          // Fall back to local executor in dev/prototype environments.
        }
        return executeNodeLocal(node, inputs);
      }

      if (node.type === 'extract') {
        const data = node.data ?? {};
        const payload = {
          videoUrl: String(inputs.video_url ?? data.videoUrl ?? ''),
          timestamp: String(inputs.timestamp ?? data.timestamp ?? '0'),
        };
        try {
          const result = await tasks.triggerAndWait('extract-frame', payload);
          if (result.ok) {
            const output = (result.output as { frameUrl?: string })?.frameUrl;
            return { output: output ?? '' };
          }
        } catch {
          // Fall back to local executor in dev/prototype environments.
        }
        return executeNodeLocal(node, inputs);
      }

      return executeNodeLocal(node, inputs);
    };

    const result = await executeWorkflow({
      nodes: body.nodes,
      edges: body.edges,
      selectedNodeIds: body.selectedNodeIds,
      executeNode,
      onNodeStart: async (nodeId, inputs) => {
        const execution = await prisma.nodeExecution.create({
          data: {
            runId: run.id,
            nodeId,
            nodeType: nodeTypeById.get(nodeId) ?? 'unknown',
            status: 'running',
            inputs: (inputs ?? {}) as Prisma.InputJsonValue,
          },
        });
        executionByNodeId.set(nodeId, execution.id);
      },
      onNodeFinish: async (record) => {
        nodeRuns.push(record);
        const executionId = executionByNodeId.get(record.nodeId);
        if (!executionId) return;
        await prisma.nodeExecution.update({
          where: { id: executionId },
          data: {
            nodeType: record.type,
            status: record.status === 'error' ? 'failed' : 'success',
            outputs: (record.outputs ?? {}) as Prisma.InputJsonValue,
            error: record.error ?? null,
            duration: new Date(record.finishedAt).getTime() - new Date(record.startedAt).getTime(),
          },
        });
      },
    });

    const duration = Date.now() - startedAt;
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: 'success',
        duration,
      },
    });

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
    });
  } catch (error) {
    const duration = Date.now() - startedAt;
    const hasSuccess = nodeRuns.some((runEntry) => runEntry.status === 'success');
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status: hasSuccess ? 'partial' : 'failed',
        duration,
      },
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Workflow run failed',
      },
      { status: 500 }
    );
  }
}
