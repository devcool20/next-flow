import { Film, UploadCloud } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo, useRef } from 'react';

type NodeData = Record<string, unknown>;

export const VideoUploadNode = memo(function VideoUploadNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
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
        updateNodeData(id, { videoUrl: dataUrl, status: 'success' });
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  return (
    <BaseNode
      id={id}
      title="Upload Video"
      icon={<Film size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      outputs={[{ id: 'video_url', label: 'video', className: 'handle-blue' }]}
    >
      <div className="flex flex-col gap-3 h-full">
        {data.videoUrl ? (
          <div className="relative w-full h-32 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 dark:bg-[#1A1A1A] dark:border-[#333] group">
            <video 
              src={String(data.videoUrl)} 
              className="w-full h-full object-cover" 
              autoPlay 
              muted 
              loop
              controls={false}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="text-neutral-700 bg-white hover:bg-neutral-100 px-3 py-1.5 rounded-md border border-neutral-200 dark:text-white text-xs dark:bg-[#222] dark:hover:bg-[#333] dark:border-[#444]"
               >
                 Change Video
               </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-32 flex flex-col items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-400 transition-colors group dark:bg-[#111111] dark:hover:bg-[#1a1a1a] dark:text-gray-500 rounded-md"
          >
            <UploadCloud size={24} className="group-hover:text-amber-500 transition-colors" />
            <span className="text-xs font-medium dark:text-gray-400">Click to upload</span>
            <span className="text-[10px] dark:text-gray-500">MP4, MOV max 50MB</span>
          </button>
        )}
        
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="video/mp4, video/quicktime, video/webm, video/x-m4v" 
          onChange={handleFileSelect}
        />
      </div>
    </BaseNode>
  );
});
