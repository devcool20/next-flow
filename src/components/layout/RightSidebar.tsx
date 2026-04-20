'use client';
import { PanelRightClose, PanelRight, History, PlayCircle, Filter } from 'lucide-react';
import { clsx } from 'clsx';

export default function RightSidebar({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <aside 
      className={clsx(
        "bg-[#111111] border-l border-[#222222] transition-all duration-300 flex flex-col relative z-20",
        isOpen ? "w-80" : "w-0 overflow-hidden"
      )}
    >
      <div className="p-4 border-b border-[#222222] flex items-center justify-between min-w-[20rem]">
        <div className="flex items-center gap-2 text-gray-200">
          <History className="w-4 h-4" />
          <span className="font-semibold text-sm">Workflow History</span>
        </div>
        <button className="text-gray-500 hover:text-white transition-colors">
          <Filter size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 min-w-[20rem]">
        
        {/* Empty State placeholder */}
        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
          <History className="w-8 h-8 text-gray-600" />
          <div>
            <p className="text-sm font-medium text-gray-300">No runs yet</p>
            <p className="text-xs text-gray-500 mt-1">Execute a workflow to see its history here.</p>
          </div>
        </div>

      </div>

      {/* Toggle Button */}
      <button 
        onClick={onToggle}
        className={clsx(
          "absolute top-4 z-50 p-1.5 bg-[#1A1A1A] border border-[#333] rounded-md text-gray-400 hover:text-white transition-all shadow-md",
          isOpen ? "left-[-14px]" : "left-[-36px]"
        )}
      >
        {isOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
      </button>

    </aside>
  );
}
