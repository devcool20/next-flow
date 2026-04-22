import { Copy, Pencil } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo, useEffect } from 'react';
import { Tooltip } from '../shared/Tooltip';

type NodeData = Record<string, unknown>;

export const TextNode = memo(function TextNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const setEditingTextNodeId = useWorkflowStore((state) => state.setEditingTextNodeId);

  useEffect(() => {
    const handleOpenEditor = (e: Event) => {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail.id === id) {
        setEditingTextNodeId(id);
      }
    };
    window.addEventListener('nextflow:open-editor', handleOpenEditor);
    return () => window.removeEventListener('nextflow:open-editor', handleOpenEditor);
  }, [id, setEditingTextNodeId]);

  return (
    <BaseNode
      id={id}
      title="Text"
      icon={<span className="font-serif text-[14px] leading-none -mt-0.5">I</span>}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      inputs={[{ id: 'input', label: 'Input' }]}
      outputs={[{ id: 'output', label: 'text' }]}
      showLabels={true}
    >
      <div className="flex items-center justify-between text-neutral-400 mb-1">
        <Tooltip content="Edit formatting" side="top">
          <button
            className="rounded p-1 hover:bg-black/10 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setEditingTextNodeId(id);
            }}
          >
            <Pencil size={12} />
          </button>
        </Tooltip>
        
        <Tooltip content="Copy text" side="top" shortcut="⌘" shortcutLabel="C">
          <button
            className="rounded p-1 hover:bg-black/10 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText((data.value as string) || '');
            }}
          >
            <Copy size={12} />
          </button>
        </Tooltip>
      </div>
      <div className="rounded-lg bg-neutral-100 dark:bg-[#111111] p-2 min-h-[104px]">
        <textarea
          className="w-full h-auto min-h-[88px] resize-none overflow-hidden bg-transparent p-0 text-[13px] font-light text-neutral-800 dark:text-white/80 placeholder:text-neutral-400 dark:placeholder:text-white/25 focus:outline-none nodrag nowheel"
          placeholder="Write something..."
          value={(data.value as string) || ''}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
            updateNodeData(id, { value: e.target.value });
          }}
        />
      </div>
    </BaseNode>
  );
});
