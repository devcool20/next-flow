import { Copy, Italic, Pencil } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo, useState } from 'react';

type NodeData = Record<string, unknown>;

export const TextNode = memo(function TextNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  return (
    <BaseNode
      id={id}
      title="Text"
      icon={<Italic size={14} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected || Boolean(data.highlighted)}
      inputs={[{ id: 'input', label: 'Input' }]}
      outputs={[{ id: 'output', label: 'text' }]}
    >
      <div className="flex items-center justify-between text-[11px] font-normal text-neutral-500 pt-1">
        <span>Input</span>
        <span className="opacity-80">Output</span>
      </div>
      <div className="flex items-center justify-between text-neutral-400 mb-1">
        <button
          className="rounded p-1 hover:bg-white/10 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditorOpen(true);
          }}
          title="Open in markdown editor"
        >
          <Pencil size={12} />
        </button>
        <button
          className="rounded p-1 hover:bg-white/10 hover:text-white transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard.writeText((data.value as string) || '');
          }}
          title="Copy node content"
        >
          <Copy size={12} />
        </button>
      </div>
      <textarea
        className="w-full h-auto min-h-[104px] resize-none overflow-hidden bg-transparent p-0 text-[13px] text-neutral-800/90 font-light placeholder:text-neutral-400 focus:outline-none dark:text-white/80 dark:placeholder:text-neutral-500 nodrag nowheel"
        placeholder="Write something..."
        value={(data.value as string) || ''}
        onChange={(e) => {
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
          updateNodeData(id, { value: e.target.value });
        }}
      />
      {isEditorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="w-[500px] flex flex-col gap-4 rounded-xl border border-white/10 bg-[#161616] p-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Markdown Editor</h3>
            <textarea
              className="min-h-[250px] w-full resize-y rounded-md border border-[#2a2a2a] bg-[#101010] p-3 text-sm text-white focus:border-[#4a4a4a] focus:outline-none nodrag nowheel"
              value={(data.value as string) || ''}
              onChange={(e) => updateNodeData(id, { value: e.target.value })}
              autoFocus
            />
            <div className="flex justify-end">
              <button
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditorOpen(false);
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </BaseNode>
  );
});
