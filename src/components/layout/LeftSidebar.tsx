'use client';
import {
  Brain,
  Crop,
  Film,
  Image as ImageIcon,
  ImageMinus,
  MoreHorizontal,
  Search,
  Sparkles,
  TypeIcon,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkflowStore } from '@/lib/store';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Tooltip } from '../shared/Tooltip';

export default function LeftSidebar({ isOpen, theme, onToggle }: { isOpen: boolean; theme?: string; onToggle: () => void }) {
  const { user } = useUser();
  const loadSampleWorkflow = useWorkflowStore((state) => state.loadSampleWorkflow);
  const persistWorkflowNow = useWorkflowStore((state) => state.persistWorkflowNow);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '';
  const displayName = email ? email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : user?.firstName || user?.username || 'User';

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('nextflow:open-search'));
  };

  const handleNodeEditorNavigate = async () => {
    try {
      await persistWorkflowNow();
    } finally {
      router.push('/nodes');
    }
  };

  return (
    <aside
      className={clsx(
        'relative z-20 flex flex-col border-r transition-[width] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        theme === 'dark' ? 'border-white/[0.06] bg-[#060606]' : 'border-neutral-200/50 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md',
        isOpen ? 'w-[210px]' : 'w-[56px]'
      )}
    >
      <div className={clsx("flex items-center overflow-hidden pt-3 pb-2", isOpen ? "justify-between px-5" : "justify-center px-0")}>
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className={`flex h-9 w-9 min-w-[36px] items-center justify-center rounded-md transition-colors ${theme === 'dark' ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-[#5f6f88] hover:bg-black/5 hover:text-black'}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
          </button>
        </div>
      </div>

      <div className={clsx("flex flex-1 flex-col gap-[1px] px-2 pt-4 pb-4 scrollbar-none", isOpen ? "overflow-y-auto overflow-x-hidden" : "overflow-visible")}>
        <div className="mb-5 flex flex-col gap-1">
          <StaticRow 
            icon={<img src="/icons/https---s-krea-ai-icons-HomeIcon-png-128.png" alt="" className="w-5 h-5 object-contain opacity-80" />} 
            label="Home" 
            isOpen={isOpen} 
            theme={theme} 
          />
          <StaticRow 
            icon={<img src="/icons/https---s-krea-ai-icons-Train-png-128.png" alt="" className="w-5 h-5 object-contain opacity-80" />} 
            label="Train Lora" 
            isOpen={isOpen} 
            theme={theme} 
          />
          <StaticRow
            icon={<img src="/icons/https---s-krea-ai-icons-NodeEditor-png-128.png" alt="" className="w-5 h-5 object-contain" />}
            label="Node Editor"
            active={pathname === '/nodes' || pathname.startsWith('/nodes/')}
            isOpen={isOpen}
            theme={theme}
            onClick={handleNodeEditorNavigate}
          />
          <StaticRow 
            icon={<img src="/icons/https---s-krea-ai-icons-Assets-png-128.png" alt="" className="w-5 h-5 object-contain opacity-60" />} 
            label="Assets" 
            isOpen={isOpen} 
            theme={theme} 
          />
        </div>

        <SectionTitle isOpen={isOpen} action={<button onClick={handleSearchClick} className="ml-auto hover:text-white"><Search size={14} /></button>}>Tools</SectionTitle>
        
        {isOpen ? (
          <div className="flex flex-col gap-[1px]">
            <NodeRow type="text" icon={<TypeIcon size={14} />} label="Text" bgColor="bg-blue-500/15" color="text-blue-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="image" icon={<ImageIcon size={14} />} label="Image" bgColor="bg-fuchsia-500/15" color="text-fuchsia-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="video" icon={<Film size={14} />} label="Video" bgColor="bg-amber-500/15" color="text-amber-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="extract" icon={<ImageMinus size={14} />} label="Extract" bgColor="bg-cyan-500/15" color="text-cyan-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="crop" icon={<Crop size={14} />} label="Crop" bgColor="bg-yellow-500/15" color="text-yellow-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="llm" icon={<Brain size={14} />} label="LLM" bgColor="bg-emerald-500/15" color="text-emerald-400" isOpen={isOpen} theme={theme} />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 mt-2">
            <NodeRow type="text" icon={<TypeIcon size={14} />} label="Text" bgColor="bg-blue-500/15" color="text-blue-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="image" icon={<ImageIcon size={14} />} label="Image" bgColor="bg-fuchsia-500/15" color="text-fuchsia-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="video" icon={<Film size={14} />} label="Video" bgColor="bg-amber-500/15" color="text-amber-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="extract" icon={<ImageMinus size={14} />} label="Extract" bgColor="bg-cyan-500/15" color="text-cyan-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="crop" icon={<Crop size={14} />} label="Crop" bgColor="bg-yellow-500/15" color="text-yellow-400" isOpen={isOpen} theme={theme} />
            <NodeRow type="llm" icon={<Brain size={14} />} label="LLM" bgColor="bg-emerald-500/15" color="text-emerald-400" isOpen={isOpen} theme={theme} />
          </div>
        )}

        <div className="mt-auto pt-4">
           <StaticRow 
            icon={<MoreHorizontal size={18} className={theme === 'dark' ? 'text-white/35' : 'text-[#5f6f88]'} />} 
            label="More" 
            isOpen={isOpen} 
            theme={theme} 
            onClick={() => setMoreOpen((open) => !open)}
          />
          {moreOpen && (
            <div className={clsx(isOpen ? 'mb-2 pl-1' : 'mb-2')}>
              <StaticRow
                icon={<Sparkles size={14} className="text-violet-400" />}
                label="Sample Workflow"
                isOpen={isOpen}
                theme={theme}
                onClick={() => {
                  loadSampleWorkflow();
                  setMoreOpen(false);
                }}
              />
            </div>
          )}
           <SectionTitle isOpen={isOpen}>Sessions</SectionTitle>
           <div className={clsx("flex items-center gap-3 rounded-md hover:bg-white/5 cursor-pointer group transition-all", isOpen ? "px-3 py-2.5" : "justify-center py-2")}>
             <div className="h-8 w-8 min-w-[32px] rounded-full border border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
               <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8' } }} />
             </div>
             {isOpen && (
              <div className="flex flex-col min-w-0">
                  <span className={clsx("text-[13px] font-medium truncate", theme === 'dark' ? "text-white/90" : "text-[#0f172a]")}>{displayName}</span>
                  <span className={clsx("text-[11px]", theme === 'dark' ? "text-white/40" : "text-[#5f6f88]")}>Free</span>
                </div>
             )}
          </div>
        </div>
      </div>

    </aside>
  );
}

function SectionTitle({ children, isOpen, action }: { children: ReactNode; isOpen: boolean; action?: ReactNode }) {
  const theme = useWorkflowStore((state) => state.theme);
  if (!isOpen) return <div className="mb-1 mt-1 h-[1px] bg-white/5 mx-2" />;
  return (
    <div className="mb-1 mt-3 px-3 flex items-center h-8">
      <h3 className={clsx(
        "whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.1em]",
        theme === 'dark' ? "text-white/30" : "text-black/30"
      )}>
        {children}
      </h3>
      {action && <div className="ml-auto text-neutral-500 flex items-center">{action}</div>}
    </div>
  );
}

function StaticRow({
  icon,
  label,
  active = false,
  isOpen,
  theme,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  isOpen: boolean;
  theme?: string;
  onClick?: () => void | Promise<void>;
}) {
  const darkClass = active
    ? 'bg-white/10 text-white font-medium'
    : 'text-white/65 hover:bg-white/5 hover:text-white';
  const lightClass = active
    ? 'bg-[#e5e9f0] text-[#0f172a]'
    : 'text-[#5f6f88] hover:bg-[#f1f4f9]';

  const btn = (
    <button
      onClick={onClick}
      className={clsx(
        'mb-[2px] flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors',
        theme === 'dark' ? darkClass : lightClass,
        !isOpen && 'justify-center px-0'
      )}
    >
      <span className="flex h-6 w-6 min-w-[24px] items-center justify-center">{icon}</span>
      {isOpen && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );

  if (!isOpen) {
    return <Tooltip content={label} side="right" className="w-full">{btn}</Tooltip>;
  }

  return btn;
}

function NodeRow({
  type,
  icon,
  label,
  color,
  bgColor,
  isOpen,
  theme,
}: {
  type: string;
  icon: ReactNode;
  label: string;
  color: string;
  bgColor: string;
  isOpen: boolean;
  theme?: string;
}) {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onClick = () => {
    window.dispatchEvent(new CustomEvent('nextflow:add-node', { detail: { type } }));
  };

  const btn = (
    <button
      className={clsx("group mb-[1px] flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-normal transition-colors", theme === 'dark' ? "text-white/65 hover:text-white hover:bg-white/5" : "text-[#5f6f88] hover:text-[#0f172a] hover:bg-[#f1f4f9]", !isOpen && "justify-center px-0")}
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      onClick={onClick}
    >
      <div className={clsx('flex h-5 w-5 min-w-[20px] items-center justify-center rounded transition-colors', bgColor, color)}>
        {icon}
      </div>
      {isOpen && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );

  if (!isOpen) {
    return <Tooltip content={label} side="right" className="w-full">{btn}</Tooltip>;
  }

  return btn;
}
