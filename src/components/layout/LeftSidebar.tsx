'use client';
import { PanelLeftClose, PanelLeft, Plus, Image as ImageIcon, FileText, UploadCloud, Type, Crop, Search, TypeIcon, ImageIcon as ImageIcon2, Film, Brain, Scissors, ImageMinus } from 'lucide-react';
import { clsx } from 'clsx';
import { UserButton } from '@clerk/nextjs';

export default function LeftSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <aside 
      className={clsx(
        "bg-[#111111] border-r border-[#222222] transition-all duration-300 flex flex-col relative z-20",
        isOpen ? "w-64" : "w-0 overflow-hidden"
      )}
    >
      <div className="p-4 border-b border-[#222222] flex items-center justify-between min-w-[16rem]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded flex items-center justify-center text-black font-bold text-xs">K</div>
          <span className="font-semibold text-sm tracking-wide">NextFlow</span>
        </div>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-6 h-6" } }} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-6 min-w-[16rem]">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search nodes..." 
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-[#555] text-gray-300 placeholder-gray-500 transition-colors"
          />
        </div>

        {/* Quick Access */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider ml-1">Quick Access</h3>
          <div className="grid grid-cols-2 gap-2">
            <NodeButton type="text" icon={<TypeIcon size={16} />} label="Text" color="text-blue-400" bgColor="bg-blue-400/10" />
            <NodeButton type="image" icon={<ImageIcon2 size={16} />} label="Image" color="text-fuchsia-400" bgColor="bg-fuchsia-400/10" />
            <NodeButton type="video" icon={<Film size={16} />} label="Video" color="text-orange-400" bgColor="bg-orange-400/10" />
            <NodeButton type="llm" icon={<Brain size={16} />} label="LLM" color="text-emerald-400" bgColor="bg-emerald-400/10" />
            <NodeButton type="crop" icon={<Crop size={16} />} label="Crop" color="text-yellow-400" bgColor="bg-yellow-400/10" />
            <NodeButton type="extract" icon={<ImageMinus size={16} />} label="Extract" color="text-cyan-400" bgColor="bg-cyan-400/10" />
          </div>
        </div>
        
      </div>

      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className={clsx(
          "absolute top-4 z-50 p-1.5 bg-[#1A1A1A] border border-[#333] rounded-md text-gray-400 hover:text-white transition-all shadow-md",
          isOpen ? "right-[-14px]" : "right-[-36px]"
        )}
      >
        {isOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
      </button>

    </aside>
  );
}

function NodeButton({ type, icon, label, color, bgColor }: { type: string, icon: React.ReactNode, label: string, color: string, bgColor: string }) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <button 
      className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg bg-[#111111] border border-[#222222] hover:bg-[#1A1A1A] hover:border-[#333] transition-all group"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
    >
      <div className={clsx("p-2 rounded-md transition-colors", bgColor, color)}>
        {icon}
      </div>
      <span className="text-xs text-gray-400 group-hover:text-gray-200 font-medium">{label}</span>
    </button>
  );
}
