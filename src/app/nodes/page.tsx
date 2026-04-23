import { auth } from '@clerk/nextjs/server';
import NodesAuthModal from '@/components/auth/NodesAuthModal';
import { isDatabaseUnavailableError } from '@/lib/api-errors';
import { listUserWorkflows } from '@/lib/workspace-server';
import NodesPageClient from './NodesPageClient';

export default async function NodesPage() {
  const { userId } = await auth();

  if (!userId) {
    return <NodesAuthModal />;
  }

  let workflows: Array<{ id: string; name: string; updatedAt: Date }> = [];
  let dbUnavailable = false;

  try {
    const result = await listUserWorkflows(userId);
    workflows = result.workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      updatedAt: workflow.updatedAt,
      nodes: workflow.nodes,
      edges: workflow.edges,
    }));
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      dbUnavailable = true;
    } else {
      throw error;
    }
  }

  if (dbUnavailable) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070a11] px-6 text-white">
        <div className="rounded-xl border border-red-300/30 bg-red-500/10 px-6 py-4 text-sm text-red-200">
          Database unavailable. Please try again in a moment.
        </div>
      </div>
    );
  }

  return <NodesPageClient workflows={workflows} />;
}
