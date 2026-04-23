'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight,
  ChevronDown, 
  EyeOff, 
  Search, 
  Sparkles, 
  Wand2, 
  Plus,
  MoreVertical, 
  Trash2, 
  Edit2, 
  Copy
} from 'lucide-react';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { WorkflowPreview } from '@/components/nodes/WorkflowPreview';
import { deleteWorkflowAction, renameWorkflowAction, duplicateWorkflowAction, createBlankWorkflowAction, createMarketingKitWorkflowAction } from './actions';

type TabId = 'projects' | 'apps' | 'examples' | 'templates';

type WorkflowCard = {
  id: string;
  name: string;
  updatedAt: string | Date;
  nodes?: unknown;
  edges?: unknown;
};

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'projects', label: 'Projects' },
  { id: 'apps', label: 'Apps' },
  { id: 'examples', label: 'Examples' },
  { id: 'templates', label: 'Templates' },
];

function getRelativeTimeLabel(date: Date) {
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  if (absMs < hour) return formatter.format(Math.round(diffMs / minute), 'minute');
  if (absMs < day) return formatter.format(Math.round(diffMs / hour), 'hour');
  return formatter.format(Math.round(diffMs / day), 'day');
}

export default function NodesPageClient({ workflows }: { workflows: WorkflowCard[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('projects');
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredWorkflows = workflows.filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleAction = async (id: string, action: 'delete' | 'rename' | 'duplicate') => {
    setMenuOpenId(null);
    if (action === 'delete') {
      if (confirm('Are you sure you want to delete this workflow?')) {
        await deleteWorkflowAction(id);
      }
    } else if (action === 'rename') {
      const newName = prompt('Enter new name:');
      if (newName) {
        await renameWorkflowAction(id, newName);
      }
    } else if (action === 'duplicate') {
      await duplicateWorkflowAction(id);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#151515] font-inter tracking-tight text-[#F5F5F5]">
      <LeftSidebar isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} theme="dark" />
      
      <main className="nodes-main-surface scrollbar-hide h-screen flex-1 overflow-x-hidden overflow-y-auto">
        <section className="nodes-hero relative w-full overflow-hidden">
          <div className="absolute inset-0">
             <img
               src="/icons/https---s-krea-ai-nodesHeaderBannerBlurGradient-webp-256.png"
               alt="Banner"
               className="nodes-hero-image h-full w-full object-cover object-center"
             />
             <div className="nodes-hero-blur-left absolute inset-y-0 left-0 w-[58%]" />
          </div>
          
          <div className="relative mx-auto flex h-full max-w-[1400px] flex-col justify-start pl-[5%] pr-12 pt-[72px]">
            <div className="mb-4 flex items-center gap-3">
              <img src="/icons/https---s-krea-ai-icons-NodeEditor-png-128.png" alt="Node Editor" className="h-[30px] w-[30px]" />
              <h1 className="text-[40px] font-normal tracking-[-0.02em] text-white">Node Editor</h1>
            </div>
            
            <p className="mb-12 max-w-[400px] text-[14px] font-medium leading-[1.5] tracking-[-0.004em] text-white/94">
              Nodes is the most powerful way to operate Next Flow. Connect every tool and model into complex automated pipelines.
            </p>
            
            <form action={createBlankWorkflowAction} className="mt-2">
              <button
                type="submit"
                className="group flex h-[39px] items-center gap-2 rounded-full bg-white px-7 text-[12px] font-semibold tracking-[-0.005em] text-black transition-colors hover:bg-[#f2f2f2]"
              >
                New Workflow
                <ArrowRight size={12} strokeWidth={1.6} className="transition-transform group-hover:translate-x-[1px]" />
              </button>
            </form>
          </div>
        </section>

        <section className="nodes-projects-surface mx-auto max-w-[1400px] px-12 pb-12 pt-8">
          <div className="mb-10 flex items-center justify-between border-b border-white/[0.06] pb-6">
            <div className="flex items-center gap-4">
              {tabs.map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-2xl px-8 py-3 text-[13px] font-semibold tracking-[-0.01em] transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#242424] text-white'
                      : 'text-white/74 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-[48px] w-[280px] items-center gap-2 rounded-2xl border border-white/[0.13] bg-[#171717] px-4 text-white/40">
                <Search size={16} className="text-white/52" />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-[14px] text-white/82 focus:outline-none placeholder:text-white/42"
                />
              </div>
              <button className="flex h-[48px] items-center gap-2 rounded-2xl border border-white/[0.13] bg-[#171717] px-5 text-[14px] font-semibold text-white/82 transition-colors hover:text-white">
                Last viewed <ChevronDown size={16} className="text-white/35" />
              </button>
              <button className="flex h-[48px] w-[52px] items-center justify-center rounded-2xl border border-white/[0.13] bg-[#171717] text-white/50 hover:text-white">
                <EyeOff size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {activeTab === 'projects' && (
              <>
                {/* New Workflow Card */}
                <form action={createBlankWorkflowAction} className="group">
                  <button
                    type="submit"
                    className="flex h-[195px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515] transition-all hover:border-white/20"
                  >
                    <div className="flex flex-1 items-center justify-center bg-[#151515]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-all group-hover:scale-110">
                        <Plus size={20} strokeWidth={2.5} />
                      </div>
                    </div>
                  </button>
                  <p className="mt-4 px-1 text-[15px] font-semibold text-[#F5F5F5]">New Workflow</p>
                </form>

                {filteredWorkflows.map((workflow) => {
                  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
                  const edges = Array.isArray(workflow.edges) ? workflow.edges : [];

                  return (
                    <div key={workflow.id} className="group relative">
                      <Link href={`/nodes/${workflow.id}`} className="relative block overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515] transition-all hover:border-white/20">
                        <div className="h-[195px] w-full bg-[#121212]">
                          <WorkflowPreview nodes={nodes} edges={edges} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-transparent to-transparent opacity-80" />
                      </Link>
                      
                      <div className="px-1 pb-1 pt-4">
                        <p className="truncate text-[15px] font-semibold tracking-tight text-[#F5F5F5]">{workflow.name || 'Untitled'}</p>
                        <p className="mt-1 text-[13px] font-medium tracking-normal text-[#999999]">Edited {getRelativeTimeLabel(new Date(workflow.updatedAt))}</p>
                      </div>

                      {/* 3-dot Menu */}
                      <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpenId(menuOpenId === workflow.id ? null : workflow.id);
                          }}
                          className="p-2 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 hover:bg-black/90 text-white/70 hover:text-white"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>

                      {menuOpenId === workflow.id && (
                        <div ref={menuRef} className="absolute right-3 top-11 z-50 w-40 rounded-2xl border border-white/10 bg-[#161616]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
                          <button onClick={() => handleAction(workflow.id, 'rename')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold hover:bg-white/5 transition-colors"><Edit2 size={14} className="text-white/40" /> Rename</button>
                          <button onClick={() => handleAction(workflow.id, 'duplicate')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold hover:bg-white/5 transition-colors"><Copy size={14} className="text-white/40" /> Duplicate</button>
                          <div className="my-1 h-[1px] bg-white/5" />
                          <button onClick={() => handleAction(workflow.id, 'delete')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-bold text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 size={14} /> Delete</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {activeTab === 'examples' && (
              <div className="col-span-full">
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <form action={createMarketingKitWorkflowAction}>
                      <button
                        type="submit"
                        className="group flex h-[270px] w-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#151515] transition-all hover:border-white/20"
                      >
                        <div className="flex flex-1 items-center justify-center bg-[#2b8dff]/5 p-6">
                           <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2b8dff]/10 text-[#2b8dff]">
                             <Sparkles size={28} />
                           </div>
                        </div>
                        <div className="px-5 py-4 text-left border-t border-white/[0.04]">
                          <p className="text-[14px] font-bold text-[#F5F5F5]">Marketing Kit</p>
                          <p className="text-[12px] text-[#999999] font-medium">Ready to use sample workflow</p>
                        </div>
                      </button>
                    </form>
                 </div>
              </div>
            )}
          </div>

          <div className="mt-20">
            <h3 className="mb-6 text-[12px] font-bold text-[#999999] uppercase tracking-[0.1em]">Templates</h3>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <form action={createMarketingKitWorkflowAction}>
                <button
                  type="submit"
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#151515] px-5 py-4 text-left transition-all hover:border-white/20"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2b8dff]/10 text-[#2b8dff]">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[#F5F5F5]">Marketing Kit</div>
                    <div className="text-[12px] text-[#999999]">Automated pipeline</div>
                  </div>
                  <Wand2 size={16} className="ml-auto text-white/10 group-hover:text-white/40 transition-colors" />
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
