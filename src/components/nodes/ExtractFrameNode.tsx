import { ImageMinus } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo } from 'react';

type NodeData = Record<string, unknown>;

export const ExtractFrameNode = memo(function ExtractFrameNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);
  const timestampLinked = hasInputConnection(id, 'timestamp');

  return (
    <BaseNode
      id={id}
      title="Extract Frame"
      icon={<ImageMinus size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      inputs={[
        { id: 'video_url', label: 'video_url', className: 'handle-blue' },
        { id: 'timestamp', label: 'timestamp' },
      ]}
      outputs={[
        { id: 'output', label: 'frame_url', className: 'handle-blue' }
      ]}
    >
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">Timestamp</label>
        
        <input 
          type="text" 
          className="w-full bg-neutral-100 rounded-md p-2 text-[13px] font-light text-neutral-800 focus:outline-none transition-colors dark:bg-[#111111] dark:text-white/80" 
          placeholder={timestampLinked ? 'linked from input' : 'e.g. 5s or 50%'}
          value={(data.timestamp as string) ?? ''}
          onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
          disabled={timestampLinked}
        />
        <span className="text-[10px] text-gray-500">Seconds or Percentage</span>
      </div>
    </BaseNode>
  );
});
