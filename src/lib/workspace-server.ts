import type { Edge, Node } from '@xyflow/react';
import { Prisma } from '@prisma/client';
import { prisma, withRetry } from '@/lib/prisma';
import { workflowSamples } from '@/lib/samples';

type WorkflowGraphInput = {
  nodes?: Node[];
  edges?: Edge[];
};

function getPlaceholderEmail(clerkUserId: string) {
  return `${clerkUserId}@clerk.local`;
}

export async function ensureUser(clerkUserId: string) {
  return withRetry(() => 
    prisma.user.upsert({
      where: { clerkId: clerkUserId },
      update: {},
      create: {
        clerkId: clerkUserId,
        email: getPlaceholderEmail(clerkUserId),
      },
    })
  );
}

export async function createWorkflowForUser(
  clerkUserId: string,
  input?: {
    name?: string;
    graph?: WorkflowGraphInput;
  }
) {
  const user = await ensureUser(clerkUserId);

  const workflow = await withRetry(() =>
    prisma.workflow.create({
      data: {
        name: input?.name?.trim() || 'Untitled',
        userId: user.id,
        nodes: (input?.graph?.nodes ?? []) as unknown as Prisma.InputJsonValue,
        edges: (input?.graph?.edges ?? []) as unknown as Prisma.InputJsonValue,
      },
    })
  );

  return { user, workflow };
}

export async function createSampleWorkflowForUser(clerkUserId: string, sampleId: string) {
  const sample = workflowSamples.find((item) => item.id === sampleId);
  if (!sample) {
    throw new Error(`Unknown sample workflow: ${sampleId}`);
  }

  return createWorkflowForUser(clerkUserId, {
    name: sample.name,
    graph: {
      nodes: structuredClone(sample.nodes),
      edges: structuredClone(sample.edges),
    },
  });
}

export async function listUserWorkflows(clerkUserId: string) {
  const user = await ensureUser(clerkUserId);

  const workflows = await withRetry(() =>
    prisma.workflow.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        nodes: true,
        edges: true,
      },
    })
  );

  return { user, workflows };
}

export async function getUserWorkflowById(clerkUserId: string, workflowId: string) {
  const user = await ensureUser(clerkUserId);

  const workflow = await withRetry(() =>
    prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId: user.id,
      },
    })
  );

  return { user, workflow };
}

export async function ensureUserAndWorkflow(clerkUserId: string) {
  const user = await ensureUser(clerkUserId);

  let workflow = await withRetry(() =>
    prisma.workflow.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    })
  );

  if (!workflow) {
    workflow = await withRetry(() =>
      prisma.workflow.create({
        data: {
          name: 'Untitled',
          userId: user.id,
          nodes: [],
          edges: [],
        },
      })
    );
  }

  return { user, workflow };
}

export async function deleteWorkflow(clerkUserId: string, workflowId: string) {
  const user = await ensureUser(clerkUserId);
  return withRetry(() =>
    prisma.workflow.deleteMany({
      where: {
        id: workflowId,
        userId: user.id,
      },
    })
  );
}

export async function renameWorkflow(clerkUserId: string, workflowId: string, name: string) {
  const user = await ensureUser(clerkUserId);
  return withRetry(() =>
    prisma.workflow.updateMany({
      where: {
        id: workflowId,
        userId: user.id,
      },
      data: { name: name.trim() },
    })
  );
}

export async function duplicateWorkflow(clerkUserId: string, workflowId: string) {
  const user = await ensureUser(clerkUserId);
  const original = await withRetry(() =>
    prisma.workflow.findFirst({
      where: { id: workflowId, userId: user.id },
    })
  );
  if (!original) throw new Error('Workflow not found');

  return withRetry(() =>
    prisma.workflow.create({
      data: {
        name: `${original.name} (Copy)`,
        userId: user.id,
        nodes: original.nodes as unknown as Prisma.InputJsonValue,
        edges: original.edges as unknown as Prisma.InputJsonValue,
      },
    })
  );
}

export function parseWorkflowJson(workflow: { nodes: unknown; edges: unknown }) {
  return {
    nodes: Array.isArray(workflow.nodes) ? (workflow.nodes as Node[]) : [],
    edges: Array.isArray(workflow.edges) ? (workflow.edges as Edge[]) : [],
  };
}

