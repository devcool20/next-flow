import { Crop } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';

export function CropNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);

  return (
    <BaseNode
      id={id}
      title="Crop Image"
      icon={<Crop size={16} />}
      status={data.status || 'idle'}
      inputs={[
        { id: 'image_url', label: 'image_url' }
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
              placeholder="0"
              value={data.x_percent ?? ''}
              onChange={(e) => updateNodeData(id, { x_percent: e.target.value })}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">Y</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder="0"
              value={data.y_percent ?? ''}
              onChange={(e) => updateNodeData(id, { y_percent: e.target.value })}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">W</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder="100"
              value={data.width_percent ?? ''}
              onChange={(e) => updateNodeData(id, { width_percent: e.target.value })}
            />
          </div>
          
          <div className="flex bg-[#1A1A1A] border border-[#333] rounded-md overflow-hidden focus-within:border-[#555] transition-colors">
            <span className="bg-[#222] text-gray-500 text-[10px] px-2 flex items-center justify-center border-r border-[#333]">H</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-gray-300 p-1.5 text-xs focus:outline-none" 
              placeholder="100"
              value={data.height_percent ?? ''}
              onChange={(e) => updateNodeData(id, { height_percent: e.target.value })}
            />
          </div>
        </div>
      </div>
    </BaseNode>
  );
}
