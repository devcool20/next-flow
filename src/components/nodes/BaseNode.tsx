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
        "rounded-xl border border-neutral-200 bg-white p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] font-suisse dark:border-white/10 dark:bg-[#161616] dark:shadow-none transition-all duration-300 relative w-[246px]",
        selected
          ? "border-[#eab308] ring-1 ring-[#eab308] shadow-[0_0_0_1px_rgba(234,179,8,1),0_0_22px_-8px_rgba(234,179,8,0.4)] dark:border-[#FFC700] dark:ring-[#FFC700] dark:shadow-[0_0_0_1px_rgba(255,199,0,1),0_0_22px_-8px_rgba(255,199,0,0.4)]"
          : "hover:border-neutral-300 dark:hover:border-white/20",
        status === 'running' && "animate-pulse-glow border-[#FFC700]/50",
        status === 'error' && "border-red-500"
      )}
    >
      {/* Node Header (Floating Outside) */}
      <div className="absolute -top-7 left-1 flex items-center gap-2">
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
      <div className="flex flex-col gap-2">
        {children}
      </div>

      {/* Input Handles (Left) */}
      {inputs.map((input, i) => (
        <div
          key={input.id}
          className="absolute left-0 -translate-x-1/2 flex items-center"
          style={{ top: `${inputs.length === 1 ? 54 : i * 29 + 52}px` }}
        >
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            title={input.label ?? input.id}
            aria-label={input.label ?? input.id}
            className="z-10 !h-3 !w-3 !rounded-full !border-[1.5px] border-white !bg-[#FFC700] transition-transform hover:scale-125 dark:border-[#161616]"
          />
        </div>
      ))}

      {/* Output Handles (Right) */}
      {outputs.map((output, i) => (
        <div
          key={output.id}
          className="absolute right-0 translate-x-1/2 flex items-center"
          style={{ top: `${outputs.length === 1 ? 54 : i * 29 + 52}px` }}
        >
          <Handle
            type="source"
            position={Position.Right}
            id={output.id}
            title={output.label ?? output.id}
            aria-label={output.label ?? output.id}
            className="z-10 !h-3 !w-3 !rounded-full !border-[1.5px] border-white !bg-[#FFC700] transition-transform hover:scale-125 dark:border-[#161616]"
          />
        </div>
      ))}
    </div>
    </>
  );
}
