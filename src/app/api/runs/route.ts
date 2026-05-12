import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { auth as triggerAuth } from '@trigger.dev/sdk/v3';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';
import { parseRequestBody, runsQuerySchema } from '@/lib/api-schemas';

const NON_TERMINAL_RUN_STATUSES = new Set(['queued', 'running']);
const REALTIME_TOKEN_TTL = process.env.NEXTFLOW_REALTIME_TOKEN_TTL ?? '30m';

function getSnapshotNodeIds(nodesSnapshot: unknown): string[] | undefined {
  if (!Array.isArray(nodesSnapshot)) return undefined;
  const nodeIds = nodesSnapshot
    .map((node) => {
      if (!node || typeof node !== 'object') return null;
      const id = (node as { id?: unknown }).id;
      return typeof id === 'string' ? id : null;
    })
    .filter((id): id is string => Boolean(id));
  return nodeIds.length > 0 ? nodeIds : undefined;
}

async function createRealtimeToken(triggerRunId: string | null, status: string) {
  if (!triggerRunId || !NON_TERMINAL_RUN_STATUSES.has(status)) {
    return undefined;
  }

  try {
    return await triggerAuth.createPublicToken({
      scopes: {
        read: {
          runs: [triggerRunId],
        },
      },
      expirationTime: REALTIME_TOKEN_TTL,
      realtime: {
        skipColumns: ['payload', 'output'],
      },
    });
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    const { user } = await ensureUserAndWorkflow(userId);
    const { workflowId } = parseRequestBody(
      runsQuerySchema,
      Object.fromEntries(request.nextUrl.searchParams),
      'Invalid runs query.'
    );

    const workflow = await withRetry(() =>
      prisma.workflow.findFirst({
        where: { id: workflowId, userId: user.id },
      })
    );

    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    const workflowRuns = await withRetry(() =>
      prisma.workflowRun.findMany({
        where: { workflowId },
        include: {
          executions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    );

    const mappedRuns = await Promise.all(workflowRuns.map(async (run) => ({
        id: run.id,
        startedAt: (run.startedAt ?? run.createdAt).toISOString(),
        finishedAt: (run.finishedAt ?? run.updatedAt).toISOString(),
        status: run.status,
        scope: run.scope,
        duration: run.duration,
        triggerRunId: run.triggerRunId ?? undefined,
        triggerPublicAccessToken: await createRealtimeToken(run.triggerRunId, run.status),
        triggerStatus: run.triggerStatus ?? undefined,
        errorCode: run.errorCode ?? undefined,
        error: run.errorMessage ?? undefined,
        nodeRuns: run.executions
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((exec) => ({
            executionId: exec.id,
            nodeId: exec.nodeId,
            type: exec.nodeType,
            title: exec.nodeType,
            status:
              exec.status === 'failed'
                ? 'error'
                : exec.status === 'running'
                  ? 'running'
                  : exec.status === 'queued'
                    ? 'queued'
                    : 'success',
            startedAt: exec.createdAt.toISOString(),
            finishedAt: exec.updatedAt.toISOString(),
            inputs: exec.inputs ?? {},
            outputs: exec.outputs ?? {},
            error: exec.error ?? undefined,
            errorCode: exec.errorCode ?? undefined,
            triggerRunId: exec.triggerRunId ?? undefined,
          })),
        executionPath: run.executions
          .filter((exec) => exec.status === 'success')
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((exec) => exec.nodeId),
        plannedNodeIds: getSnapshotNodeIds(run.nodesSnapshot),
        nodesSnapshot: run.nodesSnapshot as unknown[] ?? undefined,
        edgesSnapshot: run.edgesSnapshot as unknown[] ?? undefined,
      })));

    return NextResponse.json({
      runs: mappedRuns,
    });
  } catch (error) {
    const appError = toAppError(error, 'Failed to load runs');
    return NextResponse.json(
      {
        error: {
          code: appError.code,
          message: appError.message,
          details: appError.details,
        },
      },
      { status: appError.status }
    );
  }
}
