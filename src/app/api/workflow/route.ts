import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { ensureUserAndWorkflow, parseWorkflowJson } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    await prisma.$queryRaw`SELECT 1`;

    const { workflow } = await ensureUserAndWorkflow(userId);
    const graph = parseWorkflowJson(workflow);

    return NextResponse.json({
      workflowId: workflow.id,
      nodes: graph.nodes,
      edges: graph.edges,
    });
  } catch (error) {
    const appError = toAppError(error, 'Failed to load workflow');
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

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    await prisma.$queryRaw`SELECT 1`;

    const body = (await request.json()) as {
      workflowId: string;
      nodes: unknown;
      edges: unknown;
    };

    if (!body.workflowId) {
      throw new AppError('bad_request', 'workflowId is required', 400);
    }

    const { user } = await ensureUserAndWorkflow(userId);

    const workflow = await prisma.workflow.findFirst({
      where: { id: body.workflowId, userId: user.id },
    });
    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: {
        nodes: body.nodes as Prisma.InputJsonValue,
        edges: body.edges as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const appError = toAppError(error, 'Failed to persist workflow');
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
