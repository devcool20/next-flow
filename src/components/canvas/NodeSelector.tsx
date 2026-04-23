'use client';
import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Type, 
  ImageIcon, 
  Film, 
  Crop, 
  ImageMinus, 
  Sparkles,
  MousePointer2
} from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkflowStore } from '@/lib/store';

export type NodeType = 'text' | 'image' | 'video' | 'crop' | 'extract' | 'llm';

interface NodeOption {
  id: NodeType;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: 'Text' | 'Media' | 'AI';
}

const NODE_OPTIONS: NodeOption[] = [
  { id: 'text', label: 'Text Input', description: 'Basic text field for prompts or notes', icon: <Type size={16} />, category: 'Text' },
  { id: 'llm', label: 'Gemini AI', description: 'Advanced LLM processing with Gemini', icon: <Sparkles size={16} className="text-yellow-500" />, category: 'AI' },
  { id: 'image', label: 'Image Upload', description: 'Upload and process static images', icon: <ImageIcon size={16} className="text-blue-400" />, category: 'Media' },
  { id: 'video', label: 'Video Upload', description: 'Upload and process video files', icon: <Film size={16} className="text-blue-400" />, category: 'Media' },
  { id: 'crop', label: 'Focus Crop', description: 'Crop and focus on specific image areas', icon: <Crop size={16} className="text-blue-400" />, category: 'Media' },
  { id: 'extract', label: 'Extract Frame', description: 'Pull a specific frame from a video', icon: <ImageMinus size={16} className="text-blue-400" />, category: 'Media' },
];

export function NodeSelector({ 
  onSelect, 
  onClose,
  position 
}: { 
  onSelect: (type: NodeType) => void; 
  onClose: () => void;
  position: { x: number; y: number };
}) {
  const theme = useWorkflowStore((state) => state.theme);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = NODE_OPTIONS.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase()) ||
    opt.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredOptions.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      }
      if (e.key === 'Enter' && filteredOptions[selectedIndex]) {
        onSelect(filteredOptions[selectedIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onSelect, filteredOptions, selectedIndex]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={containerRef}
      className={clsx(
        "fixed z-[9999] w-[320px] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-200",
        theme === 'dark' 
          ? "border-white/10 bg-[#0f0f0f]/95" 
          : "border-black/5 bg-white/95"
      )}
      style={{ 
        left: Math.min(position.x, window.innerWidth - 340), 
        top: Math.min(position.y, window.innerHeight - 400) 
      }}
    >
      <div className={clsx(
        "flex items-center gap-3 border-b px-4 py-3",
        theme === 'dark' ? "border-white/5" : "border-black/5"
      )}>
        <Search size={18} className={theme === 'dark' ? "text-white/30" : "text-black/30"} />
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Search nodes or models..." 
          className={clsx(
            "w-full bg-transparent text-[14px] font-medium outline-none",
            theme === 'dark' ? "text-white placeholder-white/20" : "text-black placeholder-black/20"
          )}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setSelectedIndex(0);
          }}
        />
      </div>

      <div className="custom-scrollbar max-h-[380px] overflow-y-auto p-2">
        <div className={clsx(
          "mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-widest",
          theme === 'dark' ? "text-white/20" : "text-black/30"
        )}>
          Available Nodes
        </div>
        
        {filteredOptions.length === 0 ? (
          <div className={clsx(
            "px-3 py-8 text-center text-sm",
            theme === 'dark' ? "text-white/20" : "text-black/20"
          )}>
            No nodes found matching &quot;{search}&quot;
          </div>
        ) : (
          filteredOptions.map((opt, index) => (
            <button
              key={opt.id}
              className={clsx(
                "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                index === selectedIndex 
                  ? (theme === 'dark' ? "bg-white/10 shadow-lg" : "bg-black/5 shadow-sm")
                  : (theme === 'dark' ? "hover:bg-white/5" : "hover:bg-black/[0.02]")
              )}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => onSelect(opt.id)}
            >
              <div className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-300",
                theme === 'dark' ? "border-white/5 bg-white/5" : "border-black/5 bg-black/5",
                index === selectedIndex ? (theme === 'dark' ? "border-white/20 bg-white/10" : "border-black/10 bg-black/5") : ""
              )}>
                {opt.icon}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className={clsx(
                  "text-[13.5px] font-semibold transition-colors",
                  index === selectedIndex 
                    ? (theme === 'dark' ? "text-white" : "text-black") 
                    : (theme === 'dark' ? "text-white/60" : "text-black/60")
                )}>
                  {opt.label}
                </span>
                <span className={clsx(
                  "text-[11px] line-clamp-1",
                  theme === 'dark' ? "text-white/30" : "text-black/40"
                )}>{opt.description}</span>
              </div>
              {index === selectedIndex && (
                <div className="ml-auto animate-in slide-in-from-right-1">
                  <MousePointer2 size={14} className={theme === 'dark' ? "text-white/40" : "text-black/40"} />
                </div>
              )}
            </button>
          ))
        )}
      </div>

      <div className={clsx(
        "border-t px-4 py-2.5",
        theme === 'dark' ? "border-white/5 bg-white/2" : "border-black/5 bg-black/[0.02]"
      )}>
        <div className={clsx(
          "flex items-center gap-4 text-[10px] font-medium",
          theme === 'dark' ? "text-white/20" : "text-black/30"
        )}>
          <div className="flex items-center gap-1.5">
            <kbd className={clsx("rounded border px-1 pb-0.5", theme === 'dark' ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5")}>↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className={clsx("rounded border px-1 pb-0.5", theme === 'dark' ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5")}>↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <kbd className={clsx("rounded border px-1 pb-0.5", theme === 'dark' ? "border-white/10 bg-white/5" : "border-black/10 bg-black/5")}>ESC</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
