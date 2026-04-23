import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Shell from '@/components/layout/Shell';
import { WorkflowCanvasWithProviderHydrated } from '@/components/canvas/WorkflowCanvas';
import { isDatabaseUnavailableError } from '@/lib/api-errors';
import { getUserWorkflowById, parseWorkflowJson } from '@/lib/workspace-server';

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ workflowId: string }>;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/nodes');
  }

  const { workflowId } = await params;

  let dbUnavailable = false;
  let graph: ReturnType<typeof parseWorkflowJson> | null = null;

  try {
    const { workflow } = await getUserWorkflowById(userId, workflowId);
    if (!workflow) {
      redirect('/nodes');
    }
    graph = parseWorkflowJson(workflow);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      dbUnavailable = true;
    } else {
      throw error;
    }
  }

  if (dbUnavailable || !graph) {
    return (
      <Shell>
        <div className="flex h-full w-full items-center justify-center">
          <div className="rounded-xl border border-red-300/30 bg-red-500/10 px-6 py-4 text-sm text-red-200">
            Database unavailable. Please try again in a moment.
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="absolute inset-0 h-full w-full">
        <WorkflowCanvasWithProviderHydrated workflowId={workflowId} initialNodes={graph.nodes} initialEdges={graph.edges} />
      </div>
    </Shell>
  );
}
