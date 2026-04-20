import { TypeIcon } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';

export function TextNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <BaseNode
      id={id}
      title="Text Input"
      icon={<TypeIcon size={16} />}
      status={data.status || 'idle'}
      outputs={[{ id: 'output', label: 'text' }]}
    >
      <textarea
        className="w-full bg-[#1A1A1A] text-gray-300 border border-[#333] rounded-md p-2 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-y min-h-[80px]"
        placeholder="Enter text prompt here..."
        value={data.value || ''}
        onChange={(e) => updateNodeData(id, { value: e.target.value })}
      />
    </BaseNode>
  );
}
