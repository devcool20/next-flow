import { ImageIcon as ImageIcon2, UploadCloud } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo, useRef } from 'react';

type NodeData = Record<string, unknown>;

export const ImageUploadNode = memo(function ImageUploadNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // TODO: In a real environment, trigger Transloadit upload here
    // For now we create a local object URL to display the preview immediately
    const previewUrl = URL.createObjectURL(file);
    
    // Simulate upload delay
    updateNodeData(id, { status: 'running' });
    setTimeout(() => {
      updateNodeData(id, { imageUrl: previewUrl, status: 'success' });
    }, 1500);
  };

  return (
    <BaseNode
      id={id}
      title="Upload Image"
      icon={<ImageIcon2 size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected || Boolean(data.highlighted)}
      outputs={[{ id: 'image_url', label: 'image' }]}
    >
      <div className="flex flex-col gap-3 h-full">
        {data.imageUrl ? (
          <div className="relative w-full h-32 rounded-md overflow-hidden bg-[#1A1A1A] border border-[#333] group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={String(data.imageUrl)} alt="Uploaded" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-white text-xs bg-[#222] hover:bg-[#333] px-3 py-1.5 rounded-md border border-[#444]"
               >
                 Change Image
               </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#333] rounded-md bg-[#1A1A1A] hover:bg-[#222] hover:border-[#555] transition-colors text-gray-400 group"
          >
            <UploadCloud size={24} className="group-hover:text-fuchsia-400 transition-colors" />
            <span className="text-xs font-medium">Click to upload</span>
            <span className="text-[10px] text-gray-500">JPG, PNG, WEBP max 10MB</span>
          </button>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/jpeg, image/png, image/webp, image/gif" 
          onChange={handleFileSelect}
        />
      </div>
    </BaseNode>
  );
});
