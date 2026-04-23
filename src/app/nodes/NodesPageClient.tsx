'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { 
  ChevronDown, 
  EyeOff, 
  Search, 
  Sparkles, 
  Wand2, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Copy, 
  ExternalLink 
} from 'lucide-react';
import LeftSidebar from '@/components/layout/LeftSidebar';
import { WorkflowPreview } from '@/components/nodes/WorkflowPreview';
import { deleteWorkflowAction, renameWorkflowAction, duplicateWorkflowAction, createBlankWorkflowAction, createMarketingKitWorkflowAction } from './actions';

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

export default function NodesPageClient({ workflows }: { workflows: any[] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'projects' | 'apps' | 'examples' | 'templates'>('projects');
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
    <div className="flex h-screen bg-[#0A0A0A] text-[#F5F5F5] overflow-hidden font-inter tracking-tight">
      <LeftSidebar isOpen={isOpen} onToggle={() => setIsOpen(!isOpen)} theme="dark" />
      
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden bg-[#0A0A0A] scrollbar-none scrollbar-hide">
        {/* Banner Section - High Fidelity */}
        <section className="relative h-[380px] w-full border-b border-white/[0.04] overflow-hidden">
          <div className="absolute inset-0 bg-[#0A0A0A]">
             <img 
               src="/icons/https---s-krea-ai-nodesHeaderBannerBlurGradient-webp-256.png" 
               alt="Banner" 
               className="w-full h-full object-cover opacity-40 blur-[4px]"
             />
             <div className="absolute inset-0 bg-radial-[circle_at_center,_transparent_0%,_#0A0A0A_100%] opacity-90" />
             <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-transparent to-[#0A0A0A]" />
             <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />
          </div>
          
          <div className="relative h-full mx-auto max-w-[1400px] px-12 flex flex-col justify-center">
            <div className="flex items-center gap-5 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2b8dff] shadow-[0_0_40px_rgba(43,141,255,0.4)]">
                <img src="/icons/https---s-krea-ai-icons-NodeEditor-png-128.png" alt="Node Editor" className="h-7 w-7" />
              </div>
              <h1 className="text-[40px] font-bold tracking-[-0.03em] text-white">Node Editor</h1>
            </div>
            
            <p className="max-w-[600px] text-[15px] font-medium text-white/50 leading-[1.6] mb-10 tracking-normal">
              Nodes is the most powerful way to operate Krea. Connect every tool and model into complex automated pipelines.
            </p>
            
            <form action={createBlankWorkflowAction}>
              <button
                type="submit"
                className="group flex items-center gap-3 rounded-full bg-white px-10 py-4 text-[15px] font-bold text-black hover:bg-[#F5F5F5] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
              >
                New Workflow <span className="text-xl transition-transform group-hover:translate-x-1">&rarr;</span>
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-12 py-12">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-6 mb-10">
            <div className="flex items-center gap-4">
              {[
                { id: 'projects', label: 'Projects' },
                { id: 'apps', label: 'Apps' },
                { id: 'examples', label: 'Examples' },
                { id: 'templates', label: 'Templates' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all ${activeTab === tab.id ? 'bg-[#1a1a1a] text-white' : 'text-[#999999] hover:text-white/80'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-[240px] items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 text-white/40">
                <Search size={14} className="text-[#999999]" />
                <input 
                  type="text" 
                  placeholder="Search projects..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-[13px] w-full focus:outline-none placeholder:text-[#999999]/50"
                />
              </div>
              <button className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 text-[13px] font-bold text-[#999999] hover:text-white transition-colors">
                Last viewed <ChevronDown size={14} className="text-white/20" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-white/40 hover:text-white">
                <EyeOff size={14} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {activeTab === 'projects' && (
              <>
                {/* New Workflow Card */}
                <form action={createBlankWorkflowAction}>
                  <button
                    type="submit"
                    className="group flex flex-col w-full aspect-video rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden transition-all hover:border-white/20"
                  >
                    <div className="flex flex-1 items-center justify-center bg-[#0d0d0d]">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-xl text-white/30 group-hover:bg-white/10 group-hover:text-white transition-all">+</div>
                    </div>
                    <div className="px-5 py-4 text-left border-t border-white/[0.04]">
                      <p className="text-[14px] font-bold text-[#F5F5F5]">New Workflow</p>
                    </div>
                  </button>
                </form>

                {filteredWorkflows.map((workflow, index) => {
                  const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
                  const edges = Array.isArray(workflow.edges) ? workflow.edges : [];

                  return (
                    <div key={workflow.id} className="group relative flex flex-col aspect-video rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden transition-all hover:border-white/20">
                      <Link href={`/nodes/${workflow.id}`} className="flex-1 overflow-hidden relative">
                        <div className="h-full w-full bg-[#080808]">
                          <WorkflowPreview nodes={nodes} edges={edges} />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent opacity-80" />
                      </Link>
                      
                      <div className="px-5 py-4 bg-[#0d0d0d] border-t border-white/[0.04]">
                        <p className="truncate text-[15px] font-bold text-[#F5F5F5] tracking-tight">{workflow.name || 'Untitled'}</p>
                        <p className="mt-1 text-[13px] text-[#999999] font-medium tracking-normal">Edited {getRelativeTimeLabel(new Date(workflow.updatedAt))}</p>
                      </div>

                      {/* 3-dot Menu */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <div ref={menuRef} className="absolute top-12 right-4 z-50 w-40 rounded-2xl border border-white/10 bg-[#161616]/95 backdrop-blur-2xl p-1.5 shadow-2xl">
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
                 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <form action={createMarketingKitWorkflowAction}>
                      <button
                        type="submit"
                        className="group flex flex-col w-full aspect-video rounded-2xl border border-white/[0.06] bg-[#0d0d0d] overflow-hidden transition-all hover:border-white/20"
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
                  className="flex w-full items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#0d0d0d] px-5 py-4 text-left transition-all hover:border-white/20 group"
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
