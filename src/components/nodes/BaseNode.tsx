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
  const theme = useWorkflowStore((state) => state.theme);

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, inputs, outputs, updateNodeInternals]);

  const nodeType = type || (id.includes('node_') ? 'unknown' : id.split('_')[0]);

  return (
    <div className="relative group">
      {/* Hollow Glow Ring for Running Status */}
      {status === 'running' && (
        <div className={clsx(
          "absolute -inset-[3px] rounded-[15px] pointer-events-none z-[-1] animate-pulse-glow",
          ["image", "video", "crop", "extract"].includes(nodeType)
            ? "bg-gradient-to-r from-blue-500/20 via-blue-500/40 to-blue-500/20 blur-md"
            : "bg-gradient-to-r from-[#FFC700]/20 via-[#FFC700]/40 to-[#FFC700]/20 blur-md"
        )} />
      )}

      {/* Main Node Body */}
      <div 
        className={clsx(
          "relative flex flex-col rounded-xl border bg-white dark:bg-[#111111] transition-all duration-300",
          className || "w-[246px]",
          selected 
            ? (["image", "video", "crop", "extract"].includes(nodeType)
                ? "border-[#3b82f6] shadow-[0_0_0_1.5px_rgba(59,130,246,0.9),0_0_24px_-4px_rgba(59,130,246,0.5)]"
                : "border-[#FFC700] shadow-[0_0_0_1.5px_rgba(255,199,0,0.9),0_0_24px_-4px_rgba(255,199,0,0.5)]")
            : (status === 'running'
                ? (["image", "video", "crop", "extract"].includes(nodeType)
                    ? "node-running-blue"
                    : "node-running-yellow")
                : (status === 'error'
                    ? "border-red-500"
                    : (highlighted
                        ? (["image", "video", "crop", "extract"].includes(nodeType)
                            ? "border-[#3b82f6]/60 shadow-[0_0_0_1px_rgba(59,130,246,0.4)]"
                            : "border-[#FFC700]/60 shadow-[0_0_0_1px_rgba(255,199,0,0.4)]")
                        : "border-neutral-200 dark:border-white/5"))),
          highlighted && !selected && (theme === 'dark' ? 'ring-1 ring-white/10' : 'ring-1 ring-black/5')
        )}
      >
        {/* Node Header (Floating Outside) */}
        <div className="absolute -top-6 left-1 flex items-center gap-2">
          <div className={clsx(
            "flex h-4 w-4 items-center justify-center",
            ["image", "video", "crop", "extract"].includes(nodeType) ? "text-[#3b82f6]" : "text-[#FFC700]"
          )}>{icon}</div>
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

        {/* Input Handles (Left) */}
        {inputs.map((input, i) => (
          <Handle
            key={input.id}
            type="target"
            position={Position.Left}
            id={input.id}
            className={clsx(input.className, ["image", "video"].includes(input.id) && "handle-blue")}
            style={{ top: input.top ?? `${inputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
          />
        ))}

        {/* Output Handles (Right) */}
        {outputs.map((output, i) => (
          <Handle
            key={output.id}
            type="source"
            position={Position.Right}
            id={output.id}
            className={clsx(output.className, ["image", "video"].includes(output.id) && "handle-blue")}
            style={{ top: output.top ?? `${outputs.length === 1 ? 21.5 : i * 28 + 21.5}px` }}
          />
        ))}
      </div>
    </div>
  );
}
