'use client';
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

    // For the prototype, we convert the file to a base64 Data URL so it can be fetched by the server
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateNodeData(id, { status: 'running' });
      setTimeout(() => {
        updateNodeData(id, { imageUrl: dataUrl, status: 'success' });
      }, 1000);
    };
    reader.readAsDataURL(file);
  };

  const imageUrl = data.imageUrl || data.image_url || data.frame_url || data.video_url;

  return (
    <BaseNode
      id={id}
      type="image"
      title={String(data.label || 'Upload Image')}
      icon={<ImageIcon2 size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      inputs={[]}
      outputs={[{ id: 'image_url', label: 'image', className: 'handle-blue' }]}
    >
      <div className="flex flex-col gap-3 h-full">
        {imageUrl ? (
          <div className="relative w-full h-32 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 dark:bg-[#1A1A1A] dark:border-[#333] group">
            {String(imageUrl).startsWith('data:video/') || String(imageUrl).endsWith('.mp4') ? (
               <video src={String(imageUrl)} className="w-full h-full object-cover" autoPlay muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(imageUrl)} alt="Uploaded" className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-neutral-700 bg-white hover:bg-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:text-white text-xs dark:bg-[#222] dark:hover:bg-[#333] dark:border-[#444]"
               >
                 Change Image
               </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 flex flex-col items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-400 transition-colors group dark:bg-[#111111] dark:hover:bg-[#1a1a1a] dark:text-gray-500 rounded-md"
          >
            <UploadCloud size={24} className="group-hover:text-fuchsia-500 transition-colors" />
            <span className="text-xs font-medium dark:text-gray-400">Click to upload</span>
            <span className="text-[10px] dark:text-gray-500">JPG, PNG, WEBP max 10MB</span>
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
