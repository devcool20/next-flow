import { ImageMinus } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';

export function ExtractFrameNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <BaseNode
      id={id}
      title="Extract Frame"
      icon={<ImageMinus size={16} />}
      status={data.status || 'idle'}
      inputs={[
        { id: 'video_url', label: 'video_url' }
      ]}
      outputs={[
        { id: 'output', label: 'frame_url' }
      ]}
    >
      <div className="flex flex-col gap-2">
        <label className="text-xs text-gray-400 font-medium">Timestamp</label>
        
        <input 
          type="text" 
          className="w-full bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-sm text-gray-300 focus:outline-none focus:border-[#555] transition-colors" 
          placeholder="e.g. 5s or 50%"
          value={data.timestamp ?? ''}
          onChange={(e) => updateNodeData(id, { timestamp: e.target.value })}
        />
        <span className="text-[10px] text-gray-500">Seconds or Percentage</span>
      </div>
    </BaseNode>
  );
}
