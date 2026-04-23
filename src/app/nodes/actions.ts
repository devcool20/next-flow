'use server';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createSampleWorkflowForUser, createWorkflowForUser, deleteWorkflow, duplicateWorkflow, renameWorkflow } from '@/lib/workspace-server';
import { revalidatePath } from 'next/cache';

async function getRequiredUserId() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/nodes');
  }
  return userId;
}

export async function createBlankWorkflowAction() {
  const userId = await getRequiredUserId();
  const { workflow } = await createWorkflowForUser(userId, { name: 'Untitled' });
  redirect(`/nodes/${workflow.id}`);
}

export async function createMarketingKitWorkflowAction() {
  const userId = await getRequiredUserId();
  const { workflow } = await createSampleWorkflowForUser(userId, 'product-marketing-kit');
  redirect(`/nodes/${workflow.id}`);
}

export async function deleteWorkflowAction(workflowId: string) {
  const userId = await getRequiredUserId();
  await deleteWorkflow(userId, workflowId);
  revalidatePath('/nodes');
}

export async function renameWorkflowAction(workflowId: string, name: string) {
  const userId = await getRequiredUserId();
  await renameWorkflow(userId, workflowId, name);
  revalidatePath('/nodes');
}

export async function duplicateWorkflowAction(workflowId: string) {
  const userId = await getRequiredUserId();
  await duplicateWorkflow(userId, workflowId);
  revalidatePath('/nodes');
}
