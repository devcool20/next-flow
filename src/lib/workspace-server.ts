import type { Edge, Node } from '@xyflow/react';
import { prisma } from '@/lib/prisma';

export async function ensureUserAndWorkflow(clerkUserId: string) {
  const placeholderEmail = `${clerkUserId}@clerk.local`;
  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: {},
    create: {
      clerkId: clerkUserId,
      email: placeholderEmail,
    },
  });

  let workflow = await prisma.workflow.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' },
  });

  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: {
        name: 'Untitled',
        userId: user.id,
        nodes: [],
        edges: [],
      },
    });
  }

  return { user, workflow };
}

export function parseWorkflowJson(workflow: { nodes: unknown; edges: unknown }) {
  return {
    nodes: Array.isArray(workflow.nodes) ? (workflow.nodes as Node[]) : [],
    edges: Array.isArray(workflow.edges) ? (workflow.edges as Edge[]) : [],
  };
}
