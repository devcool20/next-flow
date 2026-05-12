import { Film, UploadCloud } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import { memo, useEffect, useRef, useState } from 'react';

type NodeData = Record<string, unknown>;

export const VideoUploadNode = memo(function VideoUploadNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return localPreview;
    });
    updateNodeData(id, { status: 'running', error: undefined });

    try {
      const form = new FormData();
      form.set('kind', 'video');
      form.set('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: form,
      });
      const payload = (await response.json()) as { url?: string; error?: { message?: string } };
      if (!response.ok || !payload.url) {
        throw new Error(payload.error?.message ?? 'Video upload failed.');
      }

      updateNodeData(id, { videoUrl: payload.url, status: 'success', error: undefined });
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    } catch (error) {
      updateNodeData(id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Video upload failed.',
      });
    } finally {
      e.target.value = '';
    }
  };

  const videoUrl = previewUrl || data.videoUrl;

  return (
    <BaseNode
      id={id}
      type="video"
      title={String(data.label || 'Upload Video')}
      icon={<Film size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      inputs={[]}
      outputs={[{ id: 'video_url', label: 'video', className: 'handle-blue' }]}
    >
      <div className="flex flex-col gap-3 h-full">
        {videoUrl ? (
          <div className="relative w-full h-32 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200 dark:bg-[#1A1A1A] dark:border-[#333] group">
            <video 
              src={String(videoUrl)} 
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
            <span className="text-xs font-medium dark:text-gray-400">
              {data.status === 'running' ? 'Uploading...' : 'Click to upload'}
            </span>
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
