import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ensureUserAndWorkflow } from '@/lib/workspace-server';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user } = await ensureUserAndWorkflow(userId);
  const workflowId = request.nextUrl.searchParams.get('workflowId');
  if (!workflowId) {
    return NextResponse.json({ error: 'workflowId is required' }, { status: 400 });
  }

  const workflow = await prisma.workflow.findFirst({
    where: { id: workflowId, userId: user.id },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId },
    include: {
      executions: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({
    runs: runs.map((run: (typeof runs)[number]) => ({
      id: run.id,
      startedAt: run.createdAt.toISOString(),
      finishedAt: run.updatedAt.toISOString(),
      status: run.status,
      scope: run.scope,
      duration: run.duration,
      nodeRuns: run.executions.map((exec: (typeof run.executions)[number]) => ({
        nodeId: exec.nodeId,
        type: exec.nodeType,
        title: exec.nodeType,
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
}
