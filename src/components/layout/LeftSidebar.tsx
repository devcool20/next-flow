'use client';
import {
  Brain,
  Crop,
  Film,
  Image as ImageIcon,
  ImageMinus,
  Search,
  TypeIcon,
  WandSparkles,
  PanelLeft,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { UserButton } from '@clerk/nextjs';
import { useWorkflowStore } from '@/lib/store';
import type { ReactNode } from 'react';
import { useState } from 'react';

export default function LeftSidebar({ isOpen, theme, onToggle }: { isOpen: boolean; theme?: string; onToggle: () => void }) {
  const loadSampleWorkflow = useWorkflowStore((state) => state.loadSampleWorkflow);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const tools = [
    { type: 'text', icon: <TypeIcon size={16} />, label: 'Text', color: 'text-[#58a6ff]', bgColor: 'bg-[#58a6ff]/15' },
    { type: 'image', icon: <ImageIcon size={16} />, label: 'Image', color: 'text-[#e879f9]', bgColor: 'bg-[#e879f9]/15' },
    { type: 'video', icon: <Film size={16} />, label: 'Video', color: 'text-[#f59e0b]', bgColor: 'bg-[#f59e0b]/15' },
    { type: 'llm', icon: <Brain size={16} />, label: 'LLM', color: 'text-[#10b981]', bgColor: 'bg-[#10b981]/15' },
    { type: 'crop', icon: <Crop size={16} />, label: 'Crop', color: 'text-[#facc15]', bgColor: 'bg-[#facc15]/15' },
    { type: 'extract', icon: <ImageMinus size={16} />, label: 'Extract', color: 'text-[#06b6d4]', bgColor: 'bg-[#06b6d4]/15' },
  ].filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSearchModalOpen(true);
  };

  return (
    <aside
      className={clsx(
        'relative z-20 flex flex-col border-r transition-all duration-300',
        theme === 'dark' ? 'border-[#222222] bg-[#050505]' : 'border-neutral-200/50 bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md',
        isOpen ? 'w-72' : 'w-16'
      )}
    >
      <div className={clsx("flex items-center overflow-hidden border-b py-5", theme === 'dark' ? 'border-[#1d1f22]' : 'border-[#d8dfeb]', isOpen ? "justify-between px-5" : "justify-center px-0")}>
        <div className="flex items-center gap-3">
          <button onClick={onToggle} className={`flex h-8 w-8 min-w-[32px] items-center justify-center rounded-md transition-colors ${theme === 'dark' ? 'text-[#8e8e8e] hover:bg-white/10 hover:text-white' : 'text-[#5f6f88] hover:bg-black/5 hover:text-black'}`}>
            <PanelLeft size={18} />
          </button>
          {isOpen && <span className={`whitespace-nowrap text-xl font-semibold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-[#0f172a]'}`}>NextFlow</span>}
        </div>
        {isOpen && <UserButton appearance={{ elements: { userButtonAvatarBox: 'h-8 w-8' } }} />}
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden px-4 py-4 scrollbar-none">
        <SectionTitle isOpen={isOpen}>Workspace</SectionTitle>
        <StaticRow icon={<img src="/icons/https---s-krea-ai-icons-HomeIcon-png-128.png" alt="Home" className="w-[18px] h-[18px] object-contain" />} label="Home" isOpen={isOpen} theme={theme} />
        <StaticRow icon={<img src="/icons/https---s-krea-ai-icons-Train-png-128.png" alt="Train" className="w-[18px] h-[18px] object-contain" />} label="Train Lora" isOpen={isOpen} theme={theme} />
        <StaticRow icon={<img src="/icons/https---s-krea-ai-icons-NodeEditor-png-128.png" alt="Node Editor" className="w-[18px] h-[18px] object-contain" />} label="Node Editor" active isOpen={isOpen} theme={theme} />
        <StaticRow icon={<img src="/icons/https---s-krea-ai-icons-Assets-png-128.png" alt="Assets" className="w-[18px] h-[18px] object-contain opacity-80" />} label="Assets" isOpen={isOpen} theme={theme} />

        <SectionTitle isOpen={isOpen} action={<button onClick={handleSearchClick} className="ml-auto hover:text-white"><Search size={14} /></button>}>Tools</SectionTitle>
        {tools.map(tool => (
          <NodeRow
            key={tool.type}
            type={tool.type}
            icon={tool.icon}
            label={tool.label}
            color={tool.color}
            bgColor={tool.bgColor}
            isOpen={isOpen}
            theme={theme}
          />
        ))}

        <div className="mt-5 space-y-2">
          <SectionTitle isOpen={isOpen}>Samples</SectionTitle>
          <button
            onClick={() => loadSampleWorkflow('product-marketing-kit')}
            className={clsx("flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors", theme === 'dark' ? "border-[#2a2f37] bg-[#14171c] text-white hover:bg-[#1b1f26]" : "border-[#d8dfeb] bg-white text-[#0f172a] hover:bg-[#f1f4f9]", !isOpen && "justify-center px-0")}
            title="Load Product Marketing Kit"
          >
            <div className="flex w-8 items-center justify-center">
              <WandSparkles size={16} className="text-[#58a6ff]" />
            </div>
            {isOpen && <span className="truncate whitespace-nowrap">Load Product Marketing Kit</span>}
          </button>
        </div>
      </div>

      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsSearchModalOpen(false)}>
          <div className={clsx("w-[480px] overflow-hidden rounded-2xl border shadow-2xl", theme === 'dark' ? "border-[#2a2a2a] bg-[#1A1A1A]" : "border-neutral-200 bg-white")} onClick={e => e.stopPropagation()}>
            <div className="flex items-center px-4 pt-4 pb-2 border-b border-transparent">
              <Search className="mr-3 text-[#5f6a7d]" size={20} />
              <input
                type="text"
                autoFocus
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xl font-medium focus:outline-none"
                style={{ color: theme === 'dark' ? '#fff' : '#000' }}
              />
              <button onClick={() => setIsSearchModalOpen(false)} className="rounded-md p-1 hover:bg-neutral-500/20"><X size={18} className="text-neutral-500" /></button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              {tools.map(tool => (
                <div key={tool.type} className={clsx("flex cursor-pointer items-center gap-4 rounded-xl p-3 hover:bg-black/5 dark:hover:bg-white/5")} onClick={() => { window.dispatchEvent(new CustomEvent('nextflow:add-node', { detail: { type: tool.type } })); setIsSearchModalOpen(false); }}>
                  <div className={clsx("flex h-12 w-12 items-center justify-center rounded-xl", tool.bgColor, tool.color)}>{tool.icon}</div>
                  <div>
                    <div className={clsx("font-semibold", theme === 'dark' ? "text-white" : "text-black")}>{tool.label}</div>
                    <div className="text-xs text-neutral-500">Add {tool.label} node to canvas</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function SectionTitle({ children, isOpen, action }: { children: ReactNode; isOpen: boolean; action?: ReactNode }) {
  if (!isOpen) return <div className="mb-1 mt-1 h-[17px]" />;
  return (
    <div className="mb-1 mt-3 px-2 flex items-center h-[17px]">
      <h3 className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-[#5f6f88] dark:text-[#6d7c98]">
        {children}
      </h3>
      {action && <div className="ml-auto text-[#5f6f88] dark:text-[#6d7c98] flex items-center">{action}</div>}
    </div>
  );
}

function StaticRow({ icon, label, active = false, isOpen, theme }: { icon: ReactNode; label: string; active?: boolean; isOpen: boolean; theme?: string }) {
  const darkClass = active
    ? 'border-white/10 bg-[#2b2d31] text-white'
    : 'border-transparent text-[#9ba3af] hover:border-white/5 hover:bg-white/5';
  const lightClass = active
    ? 'border-transparent bg-[#e5e9f0] text-[#0f172a]'
    : 'border-transparent text-[#5f6f88] hover:bg-[#f1f4f9]';

  return (
    <button
      className={clsx(
        'mb-[2px] flex h-[38px] w-full items-center gap-3 rounded-xl px-[10px] text-left text-[14px] font-medium transition-colors',
        theme === 'dark' ? darkClass : lightClass,
        !isOpen && 'justify-center px-0'
      )}
      title={!isOpen ? label : undefined}
    >
      <span className="flex h-7 w-7 min-w-[28px] items-center justify-center">{icon}</span>
      {isOpen && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
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

  return (
    <button
      className={clsx("group mb-[2px] flex h-[38px] w-full items-center gap-3 rounded-xl border border-transparent px-[10px] text-left text-[14px] font-medium transition-colors", theme === 'dark' ? "text-[#9ba3af] hover:text-white hover:bg-white/5" : "text-[#5f6f88] hover:text-[#0f172a] hover:bg-[#f1f4f9]", !isOpen && "justify-center px-0")}
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      onClick={onClick}
      title={!isOpen ? label : undefined}
    >
      <div className={clsx('flex h-6 w-6 min-w-[24px] items-center justify-center rounded-md transition-colors', bgColor, color)}>
        {icon}
      </div>
      {isOpen && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}
