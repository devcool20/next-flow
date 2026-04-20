import Shell from "@/components/layout/Shell";
import { WorkflowCanvasWithProvider } from "@/components/canvas/WorkflowCanvas";

export default function Home() {
  return (
    <Shell>
      <div className="absolute inset-0 w-full h-full bg-[#0A0A0A]">
        <WorkflowCanvasWithProvider />
      </div>
    </Shell>
  );
}

