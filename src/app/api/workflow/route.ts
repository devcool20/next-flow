import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Prisma } from '@prisma/client';
import type { Node } from '@xyflow/react';
import { prisma, withRetry } from '@/lib/prisma';
import { ensureUserAndWorkflow, parseWorkflowJson } from '@/lib/workspace-server';
import { AppError, toAppError } from '@/lib/api-errors';
import { sanitizeNodesForWorkflowPersistence } from '@/lib/run-sanitization';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

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

    const body = (await request.json()) as {
      workflowId: string;
      nodes: unknown;
      edges: unknown;
    };

    if (!body.workflowId) {
      throw new AppError('bad_request', 'workflowId is required', 400);
    }

    const { user } = await ensureUserAndWorkflow(userId);

    const workflow = await withRetry(() => 
      prisma.workflow.findFirst({
        where: { id: body.workflowId, userId: user.id },
      })
    );
    
    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    await withRetry(() => 
      prisma.workflow.update({
        where: { id: workflow.id },
        data: {
          nodes: sanitizeNodesForWorkflowPersistence(
            (Array.isArray(body.nodes) ? (body.nodes as Node[]) : []) as Node[]
          ) as unknown as Prisma.InputJsonValue,
          edges: body.edges as Prisma.InputJsonValue,
        },
      })
    );

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

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new AppError('unauthorized', 'Unauthorized', 401);
    }

    const body = (await request.json()) as {
      workflowId?: string;
      name?: string;
    };

    const workflowId = body.workflowId?.trim();
    const name = body.name?.trim();

    if (!workflowId) {
      throw new AppError('bad_request', 'workflowId is required', 400);
    }
    if (!name) {
      throw new AppError('bad_request', 'name is required', 400);
    }

    const { user } = await ensureUserAndWorkflow(userId);
    const workflow = await withRetry(() => 
      prisma.workflow.findFirst({
        where: { id: workflowId, userId: user.id },
      })
    );

    if (!workflow) {
      throw new AppError('not_found', 'Workflow not found', 404);
    }

    await withRetry(() => 
      prisma.workflow.update({
        where: { id: workflow.id },
        data: { name },
      })
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const appError = toAppError(error, 'Failed to rename workflow');
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
