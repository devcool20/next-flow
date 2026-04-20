import { Handle, Position } from '@xyflow/react';
import { clsx } from 'clsx';
import { ReactNode } from 'react';

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
  return (
    <div
      className={clsx(
        "relative w-72 rounded-xl bg-[#111] border text-white shadow-2xl transition-all duration-200",
        selected ? "border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.3)]" : "border-[#333] hover:border-[#444]",
        status === 'running' && "animate-pulse-glow border-emerald-500/50",
        status === 'error' && "border-red-500"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-[#222]">
        <div className="text-gray-400">{icon}</div>
        <div className="font-medium text-sm text-gray-200">{title}</div>
        {status === 'running' && (
          <div className="ml-auto flex items-center justify-center">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex flex-col gap-3">
        {children}
      </div>

      {/* Input Handles (Left) */}
      {inputs.map((input, i) => (
        <div key={input.id} className="absolute left-0 top-[60%] -translate-x-1/2 flex items-center" style={{ top: `${(i + 1) * 30 + 40}px` }}>
          <Handle
            type="target"
            position={Position.Left}
            id={input.id}
            className="w-3 h-3 bg-[#444] border-2 border-[#111] rounded-full hover:bg-white hover:scale-125 transition-all"
          />
          {input.label && (
            <span className="absolute left-4 text-[10px] text-gray-500 bg-[#111] px-1 whitespace-nowrap">{input.label}</span>
          )}
        </div>
      ))}

      {/* Output Handles (Right) */}
      {outputs.map((output, i) => (
        <div key={output.id} className="absolute right-0 top-[50%] translate-x-1/2 flex items-center" style={{ top: `${(i + 1) * 30 + 40}px` }}>
          {output.label && (
            <span className="absolute right-4 text-[10px] text-gray-500 bg-[#111] px-1 whitespace-nowrap">{output.label}</span>
          )}
          <Handle
            type="source"
            position={Position.Right}
            id={output.id}
            className="w-3 h-3 bg-white border-2 border-[#111] rounded-full hover:bg-white hover:scale-125 transition-all"
          />
        </div>
      ))}
    </div>
  );
}
