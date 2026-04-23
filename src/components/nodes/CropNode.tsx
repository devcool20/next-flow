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
      type="crop"
      title={String(data.label || 'Crop Image')}
      icon={<Crop size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      inputs={[
        { id: 'image_url', label: 'image_url', className: 'handle-blue' },
      ]}
      outputs={[
        { id: 'output', label: 'cropped_url', className: 'handle-blue' }
      ]}
    >
      <div className="flex flex-col gap-3">
        {Boolean(data.output) && (
          <div className="relative w-full h-32 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 dark:bg-[#1A1A1A] dark:border-[#333]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={String(data.output)} alt="Cropped" className="w-full h-full object-cover" />
          </div>
        )}
        <label className="text-xs text-gray-400 font-medium">Crop Parameters (%)</label>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex bg-neutral-100 rounded-md overflow-hidden transition-colors dark:bg-[#111111]">
            <span className="bg-neutral-200 text-neutral-600 text-[10px] px-2 flex items-center justify-center dark:bg-white/5 dark:text-white/20">X</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-neutral-800 p-1.5 text-[13px] font-light focus:outline-none dark:text-white/80" 
              placeholder={xLinked ? 'linked' : '0'}
              value={(data.x_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { x_percent: e.target.value })}
              disabled={xLinked}
            />
          </div>
          
          <div className="flex bg-neutral-100 rounded-md overflow-hidden transition-colors dark:bg-[#111111]">
            <span className="bg-neutral-200 text-neutral-600 text-[10px] px-2 flex items-center justify-center dark:bg-white/5 dark:text-white/20">Y</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-neutral-800 p-1.5 text-xs focus:outline-none dark:text-white/80" 
              placeholder={yLinked ? 'linked' : '0'}
              value={(data.y_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { y_percent: e.target.value })}
              disabled={yLinked}
            />
          </div>
          
          <div className="flex bg-neutral-100 rounded-md overflow-hidden transition-colors dark:bg-[#111111]">
            <span className="bg-neutral-200 text-neutral-600 text-[10px] px-2 flex items-center justify-center dark:bg-white/5 dark:text-white/20">W</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-neutral-800 p-1.5 text-[13px] font-light focus:outline-none dark:text-white/80" 
              placeholder={widthLinked ? 'linked' : '100'}
              value={(data.width_percent as string | number | undefined) ?? ''}
              onChange={(e) => updateNodeData(id, { width_percent: e.target.value })}
              disabled={widthLinked}
            />
          </div>
          
          <div className="flex bg-neutral-100 rounded-md overflow-hidden transition-colors dark:bg-[#111111]">
            <span className="bg-neutral-200 text-neutral-600 text-[10px] px-2 flex items-center justify-center dark:bg-white/5 dark:text-white/20">H</span>
            <input 
              type="number" 
              className="w-full bg-transparent text-neutral-800 p-1.5 text-[13px] font-light focus:outline-none dark:text-white/80" 
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
