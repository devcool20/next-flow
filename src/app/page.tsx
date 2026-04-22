import Shell from '@/components/layout/Shell';
import { WorkflowCanvasWithProviderHydrated } from '@/components/canvas/WorkflowCanvas';
import { auth } from '@clerk/nextjs/server';
import { ensureUserAndWorkflow, parseWorkflowJson } from '@/lib/workspace-server';
import { isDatabaseUnavailableError } from '@/lib/api-errors';

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  let workflowId: string | null = null;
  let initialNodes = [] as Parameters<typeof WorkflowCanvasWithProviderHydrated>[0]['initialNodes'];
  let initialEdges = [] as Parameters<typeof WorkflowCanvasWithProviderHydrated>[0]['initialEdges'];
  let dbUnavailable = false;

  try {
    const { workflow } = await ensureUserAndWorkflow(userId);
    const graph = parseWorkflowJson(workflow);
    workflowId = workflow.id;
    initialNodes = graph.nodes;
    initialEdges = graph.edges;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      dbUnavailable = true;
    } else {
      throw error;
    }
  }

  if (dbUnavailable || !workflowId) {
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
        <WorkflowCanvasWithProviderHydrated workflowId={workflowId} initialNodes={initialNodes} initialEdges={initialEdges} />
      </div>
    </Shell>
  );
}
