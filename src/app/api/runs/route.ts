import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { runs } from '@trigger.dev/sdk/v3';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';

const NON_TERMINAL_RUN_STATUSES = new Set(['queued', 'running']);
const FAIL_FAST_NOT_STARTED_MS = Number(process.env.NEXTFLOW_TRIGGER_FAIL_FAST_MS ?? 20_000);
const RECONCILE_LIMIT = 3;
const RECONCILE_HEARTBEAT_MS = 8_000;

function safeFailFastMs() {
  return Number.isFinite(FAIL_FAST_NOT_STARTED_MS) && FAIL_FAST_NOT_STARTED_MS >= 5_000
    ? FAIL_FAST_NOT_STARTED_MS
    : 20_000;
}

function isTriggerPendingStatus(status: string | undefined) {
  if (!status) return false;
  return status === 'PENDING_VERSION' || status === 'QUEUED' || status === 'DEQUEUED';
}

function isTriggerFailureStatus(status: string | undefined) {
  if (!status) return false;
  return (
    status === 'FAILED' ||
    status === 'CRASHED' ||
    status === 'SYSTEM_FAILURE' ||
    status === 'TIMED_OUT' ||
    status === 'EXPIRED' ||
    status === 'CANCELED'
  );
}

function extractTriggerErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string' && error.trim()) return error.trim();
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    if (typeof candidate.message === 'string' && candidate.message.trim()) {
      return candidate.message.trim();
    }
  }
  return null;
}

async function reconcileStaleRuns(workflowId: string) {
  const failFastMs = safeFailFastMs();
  const now = Date.now();
  const heartbeatCutoff = new Date(now - RECONCILE_HEARTBEAT_MS);

  const staleRuns = await withRetry(() =>
    prisma.workflowRun.findMany({
      where: {
        workflowId,
        status: { in: [...NON_TERMINAL_RUN_STATUSES] },
        triggerRunId: { not: null },
        OR: [{ reconciledAt: null }, { reconciledAt: { lt: heartbeatCutoff } }],
      },
      orderBy: { createdAt: 'asc' },
      take: RECONCILE_LIMIT,
    })
  );

  for (const staleRun of staleRuns) {
    const createdAtMs = staleRun.createdAt.getTime();
    const ageMs = now - createdAtMs;

    if (ageMs < failFastMs) {
      continue;
    }

    const triggerRunId = staleRun.triggerRunId;
    if (!triggerRunId) continue;

    try {
      const triggerRun = await runs.retrieve(triggerRunId);
      const triggerStatus = String(triggerRun.status ?? '').toUpperCase();

      if (isTriggerPendingStatus(triggerStatus)) {
        const message = `Trigger run did not start within ${Math.round(failFastMs / 1000)}s. Check Trigger.dev deployment/env configuration.`;
        await withRetry(() =>
          prisma.workflowRun.update({
            where: { id: staleRun.id },
            data: {
              status: 'failed',
              triggerStatus,
              errorCode: 'trigger_not_started',
              errorMessage: message,
              duration: now - staleRun.createdAt.getTime(),
              finishedAt: new Date(),
              reconciledAt: new Date(),
            },
          })
        );

        await withRetry(() =>
          prisma.nodeExecution.updateMany({
            where: {
              runId: staleRun.id,
              status: { in: ['queued', 'running'] },
            },
            data: {
              status: 'failed',
              errorCode: 'trigger_not_started',
              error: message,
            },
          })
        );
        continue;
      }

      if (isTriggerFailureStatus(triggerStatus)) {
        const message = extractTriggerErrorMessage(triggerRun.error) ?? `Trigger run failed with status ${triggerStatus}.`;
        await withRetry(() =>
          prisma.workflowRun.update({
            where: { id: staleRun.id },
            data: {
              status: 'failed',
              triggerStatus,
              errorCode: 'trigger_run_failed',
              errorMessage: message,
              duration: now - staleRun.createdAt.getTime(),
              finishedAt: new Date(),
              reconciledAt: new Date(),
            },
          })
        );

        await withRetry(() =>
          prisma.nodeExecution.updateMany({
            where: {
              runId: staleRun.id,
              status: { in: ['queued', 'running'] },
            },
            data: {
              status: 'failed',
              errorCode: 'trigger_run_failed',
              error: message,
            },
          })
        );
        continue;
      }

      const shouldUpdateHeartbeat =
        staleRun.triggerStatus !== triggerStatus ||
        !staleRun.reconciledAt ||
        now - staleRun.reconciledAt.getTime() > RECONCILE_HEARTBEAT_MS;

      if (shouldUpdateHeartbeat) {
        await withRetry(() =>
          prisma.workflowRun.update({
            where: { id: staleRun.id },
            data: {
              triggerStatus,
              reconciledAt: new Date(),
            },
          })
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to retrieve Trigger run status.';
      await withRetry(() =>
        prisma.workflowRun.update({
          where: { id: staleRun.id },
          data: {
            triggerStatus: 'STATUS_UNAVAILABLE',
            errorCode: staleRun.errorCode ?? 'trigger_status_unavailable',
            errorMessage: staleRun.errorMessage ?? message,
            reconciledAt: new Date(),
          },
        })
      );
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    const { user } = await ensureUserAndWorkflow(userId);
    const workflowId = request.nextUrl.searchParams.get('workflowId');
    if (!workflowId) {
      throw new AppError('bad_request', 'workflowId is required', 400);
    }

    const workflow = await withRetry(() =>
      prisma.workflow.findFirst({
        where: { id: workflowId, userId: user.id },
      })
    );

    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    await reconcileStaleRuns(workflowId);

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

    return NextResponse.json({
      runs: workflowRuns.map((run) => ({
        id: run.id,
        startedAt: (run.startedAt ?? run.createdAt).toISOString(),
        finishedAt: (run.finishedAt ?? run.updatedAt).toISOString(),
        status: run.status,
        scope: run.scope,
        duration: run.duration,
        triggerRunId: run.triggerRunId ?? undefined,
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
        nodesSnapshot: run.nodesSnapshot as any[] ?? undefined,
        edgesSnapshot: run.edgesSnapshot as any[] ?? undefined,
      })),
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
