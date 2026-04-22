import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { ReactNode } from 'react';
import { useWorkflowStore } from '@/lib/store';

interface BaseNodeProps {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  status?: 'idle' | 'running' | 'success' | 'error';
  inputs?: { id: string; label?: string }[];
  outputs?: { id: string; label?: string }[];
  selected?: boolean;
  highlighted?: boolean;
  className?: string;
}

export function BaseNode({
  id,
  title,
  icon,
  children,
  status = 'idle',
  inputs = [],
  outputs = [],
  selected = false,
  highlighted = false,
  className,
}: BaseNodeProps) {
  const duplicateSelectedNodes = useWorkflowStore((state) => state.duplicateSelectedNodes);
  const deleteSelectedNodes = useWorkflowStore((state) => state.deleteSelectedNodes);
  const nodeData = useWorkflowStore((state) => state.nodes.find((n) => n.id === id)?.data);
  const displayTitle = (nodeData?.title as string) || title;

  return (
    <>
      <div
      data-node-id={id}
      className={clsx(
        "rounded-xl border font-suisse transition-all duration-300 relative",
        /* Light: pure white card. Dark: slightly lighter than canvas (#1a1a1a) */
        "bg-white dark:bg-[#1e1e1e]",
        "shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-none",
        className || "w-[246px]",
        selected
          ? "border-[#FFC700] shadow-[0_0_0_1.5px_rgba(255,199,0,0.9),0_0_18px_-6px_rgba(255,199,0,0.4)] dark:border-[#FFC700] dark:shadow-[0_0_0_1.5px_rgba(255,199,0,0.9),0_0_18px_-6px_rgba(255,199,0,0.4)]"
          : highlighted
          ? "border-[#FFC700]/60 shadow-[0_0_0_1px_rgba(255,199,0,0.4)] dark:border-[#FFC700]/50"
          : "border-transparent",
        status === 'running' && "animate-pulse-glow border-[#FFC700]/50",
        status === 'error' && "border-red-500"
      )}
    >
      {/* Node Header (Floating Outside) */}
      <div className="absolute -top-6 left-1 flex items-center gap-2">
        <div className="text-[#FFC700] flex h-4 w-4 items-center justify-center">{icon}</div>
        <div className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400">{displayTitle}</div>
        {status === 'running' && (
          <div className="ml-auto flex items-center justify-center">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-2 p-3">
        {children}
      </div>

      {/* Input Handles (Left) - aligned with the Input/Output label row */}
      {inputs.map((input, i) => (
        <Handle
          key={input.id}
          type="target"
          position={Position.Left}
          id={input.id}
          title={input.label ?? input.id}
          aria-label={input.label ?? input.id}
          style={{ top: `${inputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
        />
      ))}

      {/* Output Handles (Right) - aligned with Output label */}
      {outputs.map((output, i) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          title={output.label ?? output.id}
          aria-label={output.label ?? output.id}
          style={{ top: `${outputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
        />
      ))}
    </div>
    </>
  );
}
