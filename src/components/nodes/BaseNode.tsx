import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react';
import { clsx } from 'clsx';
import { ReactNode, useEffect } from 'react';
import { useWorkflowStore } from '@/lib/store';

interface BaseNodeProps {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  type?: string;
  status?: 'idle' | 'running' | 'success' | 'error';
  inputs?: { id: string; label?: string; className?: string; top?: number | string }[];
  outputs?: { id: string; label?: string; className?: string; top?: number | string }[];
  selected?: boolean;
  highlighted?: boolean;
  className?: string;
  showLabels?: boolean;
}

export function BaseNode({
  id,
  title,
  icon,
  children,
  type,
  status = 'idle',
  inputs = [],
  outputs = [],
  selected = false,
  highlighted = false,
  className,
  showLabels = false,
}: BaseNodeProps) {
  const updateNodeInternals = useUpdateNodeInternals();
  const nodeData = useWorkflowStore((state) => state.nodes.find((n) => n.id === id)?.data);
  const displayTitle = (nodeData?.label as string) || (nodeData?.title as string) || title;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputs, outputs, updateNodeInternals]);

  const nodeType = type || (id.includes('node_') ? 'unknown' : id.split('_')[0]);

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
        status === 'running'
          ? (["image", "video", "crop", "extract"].includes(nodeType)
            ? "node-running-blue"
            : "node-running-yellow")
          : status === 'error'
          ? "border-red-500"
          : selected
          ? (["image", "video", "crop", "extract"].includes(nodeType)
            ? "border-[#3b82f6] shadow-[0_0_0_1.5px_rgba(59,130,246,0.9),0_0_24px_-4px_rgba(59,130,246,0.5)] dark:border-[#3b82f6] dark:shadow-[0_0_0_1.5px_rgba(59,130,246,0.9),0_0_24px_-4px_rgba(59,130,246,0.5)]"
            : "border-[#FFC700] shadow-[0_0_0_1.5px_rgba(255,199,0,0.9),0_0_24px_-4px_rgba(255,199,0,0.5)] dark:border-[#FFC700] dark:shadow-[0_0_0_1.5px_rgba(255,199,0,0.9),0_0_24px_-4px_rgba(255,199,0,0.5)]")
          : highlighted
          ? "border-[#FFC700]/60 shadow-[0_0_0_1px_rgba(255,199,0,0.4)] dark:border-[#FFC700]/50"
          : (["image", "video", "crop", "extract"].includes(nodeType)
            ? "border-[#3b82f6]/40 dark:border-[#3b82f6]/30"
            : "border-transparent")
      )}
    >
      {/* Node Header (Floating Outside) */}
      <div className="absolute -top-6 left-1 flex items-center gap-2">
        <div className="text-[#FFC700] flex h-4 w-4 items-center justify-center">{icon}</div>
        <div className="text-[12px] font-medium text-neutral-600 dark:text-neutral-400">{displayTitle}</div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col gap-2 p-3">
        {showLabels && (inputs.length > 0 || outputs.length > 0) && (
          <div className="flex items-center justify-between text-[11px] font-normal text-neutral-500 pb-1 px-0.5">
            <span>{inputs.length > 0 ? 'Input' : ''}</span>
            <span className="opacity-80">{outputs.length > 0 ? 'Output' : ''}</span>
          </div>
        )}
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
          className={input.className}
          style={{ top: input.top ?? `${inputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
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
          className={output.className}
          style={{ top: output.top ?? `${outputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
        />
      ))}
    </div>
    </>
  );
}
