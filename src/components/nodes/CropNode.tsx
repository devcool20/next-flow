import { Crop } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo } from 'react';

type NodeData = Record<string, unknown>;

export const CropNode = memo(function CropNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);

  const imageLinked = hasInputConnection(id, 'image_url');
  const xLinked = hasInputConnection(id, 'x_percent');
  const yLinked = hasInputConnection(id, 'y_percent');
  const widthLinked = hasInputConnection(id, 'width_percent');
  const heightLinked = hasInputConnection(id, 'height_percent');

  return (
    <BaseNode
      id={id}
      title="Crop Image"
      icon={<Crop size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected || Boolean(data.highlighted)}
      inputs={[
        { id: 'image_url', label: 'image_url' },
        { id: 'x_percent', label: 'x%' },
        { id: 'y_percent', label: 'y%' },
        { id: 'width_percent', label: 'w%' },
        { id: 'height_percent', label: 'h%' },
      ]}
      outputs={[
        { id: 'output', label: 'cropped_url' }
      ]}
    >
      <div className="flex flex-col gap-3">
        <label className="text-xs text-gray-400 font-medium">Crop Parameters (%)</label>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">X</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder={xLinked ? 'linked' : '0'}
              value={(data.x_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { x_percent: e.target.value })}
              disabled={xLinked}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">Y</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder={yLinked ? 'linked' : '0'}
              value={(data.y_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { y_percent: e.target.value })}
              disabled={yLinked}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">W</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder={widthLinked ? 'linked' : '100'}
              value={(data.width_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { width_percent: e.target.value })}
              disabled={widthLinked}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">H</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder={heightLinked ? 'linked' : '100'}
              value={(data.height_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { height_percent: e.target.value })}
              disabled={heightLinked}
            />
          </div>
        </div>
        {imageLinked && <span className="text-[10px] text-gray-500">image_url linked from upstream</span>}
      </div>
    </BaseNode>
  );
});
