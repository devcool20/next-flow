import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureUserAndWorkflow, parseWorkflowJson } from '@/lib/workspace-server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { workflow } = await ensureUserAndWorkflow(userId);
  const graph = parseWorkflowJson(workflow);

  return NextResponse.json({
    workflowId: workflow.id,
    nodes: graph.nodes,
    edges: graph.edges,
  });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    workflowId: string;
    nodes: unknown;
    edges: unknown;
  };

  const { user } = await ensureUserAndWorkflow(userId);

  const workflow = await prisma.workflow.findFirst({
    where: { id: body.workflowId, userId: user.id },
  });
  if (!workflow) {
    return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
  }

  await prisma.workflow.update({
    where: { id: workflow.id },
    data: {
      nodes: body.nodes as Prisma.InputJsonValue,
      edges: body.edges as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ ok: true });
}
