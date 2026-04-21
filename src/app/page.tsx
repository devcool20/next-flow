import Shell from '@/components/layout/Shell';
import { WorkflowCanvasWithProviderHydrated } from '@/components/canvas/WorkflowCanvas';
import { auth } from '@clerk/nextjs/server';
import { ensureUserAndWorkflow, parseWorkflowJson } from '@/lib/workspace-server';

export default async function Home() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }
  const { workflow } = await ensureUserAndWorkflow(userId);
  const graph = parseWorkflowJson(workflow);

  return (
    <Shell>
      <div className="absolute inset-0 h-full w-full">
        <WorkflowCanvasWithProviderHydrated workflowId={workflow.id} initialNodes={graph.nodes} initialEdges={graph.edges} />
      </div>
    </Shell>
  );
}

