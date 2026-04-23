import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';

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

    const runs = await withRetry(() => 
      prisma.workflowRun.findMany({
        where: { workflowId },
        include: {
          executions: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    );

    const labelByNodeId = new Map<string, string>();
    const parsedNodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
    for (const rawNode of parsedNodes) {
      if (!rawNode || typeof rawNode !== 'object') continue;
      const node = rawNode as { id?: string; data?: { label?: string } };
      if (!node.id) continue;
      labelByNodeId.set(node.id, node.data?.label ?? node.id);
    }

    return NextResponse.json({
      runs: runs.map((run: (typeof runs)[number]) => ({
        id: run.id,
        startedAt: run.createdAt.toISOString(),
        finishedAt: run.updatedAt.toISOString(),
        status: run.status,
        scope: run.scope,
        duration: run.duration,
        nodeRuns: run.executions.map((exec: (typeof run.executions)[number]) => ({
          executionId: exec.id,
          nodeId: exec.nodeId,
          type: exec.nodeType,
          title: labelByNodeId.get(exec.nodeId) ?? exec.nodeType,
          status: exec.status === 'failed' ? 'error' : exec.status === 'running' ? 'running' : 'success',
          startedAt: exec.createdAt.toISOString(),
          finishedAt: exec.updatedAt.toISOString(),
          inputs: exec.inputs ?? {},
          outputs: exec.outputs ?? {},
          error: exec.error ?? undefined,
        })),
        executionPath: run.executions
          .filter((exec: (typeof run.executions)[number]) => exec.status !== 'failed')
          .sort(
            (a: (typeof run.executions)[number], b: (typeof run.executions)[number]) =>
              a.createdAt.getTime() - b.createdAt.getTime()
          )
          .map((exec: (typeof run.executions)[number]) => exec.nodeId),
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
