import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { tasks } from '@trigger.dev/sdk/v3';
import { Prisma } from '@prisma/client';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';
import { getIncludedGraph } from '@/lib/run-graph';
import { stripRuntimeNodeDataForExecution, sanitizeNodesForWorkflowPersistence } from '@/lib/run-sanitization';
import { parseRequestBody, runBodySchema } from '@/lib/api-schemas';
import type { RunBody, WorkflowOrchestratorPayload } from '@/lib/run-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

type DependencyState = {
  database: 'ok' | 'unavailable';
  trigger: 'ok' | 'unavailable' | 'not_required';
  gemini: 'ok' | 'unavailable' | 'not_required';
};

function createErrorResponse(error: unknown, dependencies?: Partial<DependencyState>) {
  const appError = toAppError(error, 'Failed to queue workflow run');
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

function ensureDependencies(nodes: RunBody['nodes']): DependencyState {
  const hasLlmNodes = nodes.some((node) => node.type === 'llm');
  const triggerSecret = process.env.TRIGGER_SECRET_KEY ?? '';
  const projectRef = process.env.TRIGGER_PROJECT_REF ?? '';
  const allowDevTriggerKey =
    process.env.NEXTFLOW_ALLOW_DEV_TRIGGER_KEY === '1' ||
    process.env.NEXTFLOW_ALLOW_DEV_TRIGGER_KEY?.toLowerCase() === 'true';

  const dependencies: DependencyState = {
    database: 'ok',
    trigger: 'ok',
    gemini: hasLlmNodes ? 'ok' : 'not_required',
  };

  if (!triggerSecret) {
    dependencies.trigger = 'unavailable';
    throw new AppError('dependency_unavailable', 'Trigger.dev is not configured. Missing TRIGGER_SECRET_KEY.', 503, {
      dependency: 'trigger',
      dependencies,
    });
  }

  if (!projectRef.trim()) {
    dependencies.trigger = 'unavailable';
    throw new AppError('dependency_unavailable', 'Trigger.dev is not configured. Missing TRIGGER_PROJECT_REF.', 503, {
      dependency: 'trigger',
      dependencies,
    });
  }

  if (process.env.NODE_ENV === 'production' && triggerSecret.startsWith('tr_dev_')) {
    dependencies.trigger = 'unavailable';
    throw new AppError(
      'dependency_unavailable',
      'Production is using a Trigger.dev development key. Use a production TRIGGER_SECRET_KEY (tr_prod_...).',
      503,
      {
        dependency: 'trigger',
        dependencies,
      }
    );
  }

  if (process.env.NODE_ENV !== 'production' && triggerSecret.startsWith('tr_dev_') && !allowDevTriggerKey) {
    dependencies.trigger = 'unavailable';
    throw new AppError(
      'dependency_unavailable',
      'Local app is configured with a Trigger.dev development key (tr_dev_*). Use a production key (tr_prod_*) for cloud-worker execution, or explicitly allow dev key with NEXTFLOW_ALLOW_DEV_TRIGGER_KEY=true.',
      503,
      {
        dependency: 'trigger',
        dependencies,
      }
    );
  }

  if (hasLlmNodes && !process.env.GEMINI_API_KEY) {
    dependencies.gemini = 'unavailable';
    throw new AppError('dependency_unavailable', 'Gemini API key is missing. Configure GEMINI_API_KEY.', 503, {
      dependency: 'gemini',
      dependencies,
    });
  }

  return dependencies;
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

    const body = parseRequestBody(runBodySchema, await request.json(), 'Invalid run payload.') as RunBody;

    const { user } = await ensureUserAndWorkflow(userId);
    const workflow = await withRetry(() =>
      prisma.workflow.findFirst({
        where: { id: body.workflowId, userId: user.id },
      })
    );

    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    const includedGraph = getIncludedGraph(body.nodes, body.edges, body.selectedNodeIds);
    if (includedGraph.nodes.length === 0) {
      throw new AppError('invalid_input', 'No executable nodes found for this run.', 400);
    }

    dependencies = ensureDependencies(includedGraph.nodes);

    const run = await withRetry(() =>
      prisma.workflowRun.create({
        data: {
          workflowId: workflow.id,
          status: 'running',
          scope: body.scope,
          triggerStatus: 'QUEUED',
          startedAt: new Date(),
          nodesSnapshot: sanitizeNodesForWorkflowPersistence(body.nodes) as unknown as Prisma.InputJsonValue,
          edgesSnapshot: body.edges as unknown as Prisma.InputJsonValue,
        },
      })
    );

    const payload: WorkflowOrchestratorPayload = {
      runId: run.id,
      workflowId: workflow.id,
      scope: body.scope,
      nodes: stripRuntimeNodeDataForExecution(body.nodes),
      edges: body.edges,
      selectedNodeIds: body.selectedNodeIds,
      queuedAt: run.createdAt.toISOString(),
    };

    let triggerHandleId: string | null = null;
    let triggerPublicAccessToken: string | null = null;
    try {
      const handle = await tasks.trigger('orchestrate-workflow-run', payload, {
        idempotencyKey: ['workflow-run', run.id],
        maxAttempts: 1,
        maxDuration: 300,
        tags: [`workflow:${workflow.id}`, `run:${run.id}`, `user:${user.id}`],
      });

      triggerHandleId = handle.id;
      triggerPublicAccessToken = handle.publicAccessToken;
      await withRetry(() =>
        prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            triggerRunId: handle.id,
            triggerStatus: 'QUEUED',
          },
        })
      );
    } catch (error) {
      await withRetry(() =>
        prisma.workflowRun.update({
          where: { id: run.id },
          data: {
            status: 'failed',
            triggerStatus: 'FAILED',
            errorCode: 'trigger_enqueue_failed',
            errorMessage: error instanceof Error ? error.message : 'Unable to enqueue Trigger.dev run.',
            finishedAt: new Date(),
            duration: Date.now() - run.createdAt.getTime(),
          },
        })
      );
      throw error;
    }

    return NextResponse.json(
      {
        run: {
          id: run.id,
          status: 'running',
          scope: body.scope,
          startedAt: (run.startedAt ?? run.createdAt).toISOString(),
          finishedAt: run.createdAt.toISOString(),
          nodeRuns: [],
          executionPath: [],
          plannedNodeIds: includedGraph.nodes.map((node) => node.id),
          triggerRunId: triggerHandleId,
          triggerPublicAccessToken,
        },
        dependencies,
      },
      { status: 202 }
    );
  } catch (error) {
    return createErrorResponse(error, dependencies);
  }
}
