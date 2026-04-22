import { Brain, ChevronDown, ChevronRight, Pencil, Image as ImageIcon } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import { memo, useState } from 'react';

type NodeData = Record<string, unknown>;

export const LLMNode = memo(function LLMNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);
  const systemLinked = hasInputConnection(id, 'system_prompt');
  const userLinked = hasInputConnection(id, 'user_message');
  const imagesLinked = hasInputConnection(id, 'images');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Define handles with explicit top offsets to align with the visual rows
  const inputs = [
    { id: 'user_message', label: 'user', top: '265px' },
    { id: 'images', label: 'image(s)', className: 'handle-blue', top: '385px' }
  ];

  // System prompt handle is visible if drawer is open OR if it is linked
  if (isSettingsOpen || systemLinked) {
    // If settings are closed but linked, we show it at a default position or same position
    inputs.push({ id: 'system_prompt', label: 'system', className: '', top: isSettingsOpen ? '468px' : '425px' });
  }

  return (
    <BaseNode
      id={id}
      title={String(data.label || 'LLM')}
      icon={<Brain size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      className="w-[340px]"
      inputs={inputs}
      outputs={[
        { id: 'output', label: 'response', top: '253px' }
      ]}
    >
      <div className="flex flex-col relative">
        {/* Output Area - Now at the top */}
        <div className="w-full bg-neutral-100 dark:bg-[#1A1A1A] rounded-md min-h-[220px] p-4 text-[15px] font-normal text-neutral-800 dark:text-white mb-2 custom-scrollbar overflow-y-auto">
          {data.output ? (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{String(data.output).replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          ) : (
             <span className="text-neutral-400 dark:text-white/20"></span>
          )}
        </div>

        {/* Output Label aligned to the right handle */}
        <div className="flex justify-end items-center mb-4 pr-1">
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Output</span>
        </div>

        {/* User Prompt Section */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Prompt</span>
          <Pencil size={12} className="text-neutral-500 dark:text-white/20" />
        </div>
        
        <div className={userLinked ? "opacity-50 pointer-events-none mb-3" : "mb-3"}>
          <textarea
            className="w-full bg-neutral-100 dark:bg-[#1A1A1A] rounded-md p-3 text-[13px] font-light text-neutral-800 dark:text-white/80 focus:outline-none transition-colors min-h-[100px] resize-none overflow-hidden placeholder:text-neutral-400 dark:placeholder:text-white/20"
            placeholder={userLinked ? 'user prompt linked' : 'hi'}
            value={(data.userMessage as string) || ''}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            disabled={userLinked}
          />
        </div>

        {/* Image Section */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Image</span>
          <div className={imagesLinked ? "opacity-50 pointer-events-none flex-1" : "flex-1"}>
             <div className="flex items-center justify-between w-full bg-neutral-100 dark:bg-[#111111] rounded-md px-3 py-1.5 cursor-text">
                <span className="text-[13px] text-neutral-500 dark:text-white/40">Add file</span>
                <ImageIcon size={12} className="text-neutral-500 dark:text-white/20" />
             </div>
          </div>
        </div>

        {/* Settings Collapsible Section */}
        <div className="flex flex-col">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-white/40 hover:text-neutral-700 dark:hover:text-white/60 transition-colors mb-2 w-max"
          >
            {isSettingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Settings</span>
          </button>
          
          {isSettingsOpen && (
            <div className="flex flex-col gap-3 pl-1 animate-in slide-in-from-top-1 fade-in">
              <div className="flex items-center gap-3">
                 <span className="text-[13px] text-neutral-500 dark:text-white/40 w-[45px]">Model</span>
                  <select
                    className="flex-1 bg-neutral-100 dark:bg-[#111111] rounded-md p-1.5 px-3 text-[13px] font-medium text-neutral-800 dark:text-white focus:outline-none transition-colors appearance-none"
                    value={(data.model as string) || 'gemini-2.5-flash'}
                    onChange={(e) => updateNodeData(id, { model: e.target.value })}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </select>
              </div>
              
              <div className={systemLinked ? "opacity-50 pointer-events-none flex flex-col gap-1" : "flex flex-col gap-1"}>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-neutral-500 dark:text-white/40">System Prompt</span>
                  <Pencil size={12} className="text-neutral-500 dark:text-white/20" />
                </div>
                <textarea
                  className="w-full bg-neutral-100 dark:bg-[#111111] rounded-md p-3 text-[13px] font-light text-neutral-800 dark:text-white/80 focus:outline-none transition-colors min-h-[60px] resize-none overflow-hidden"
                  placeholder={systemLinked ? 'system prompt linked' : 'You are a helpful assistant.'}
                  value={(data.systemPrompt as string) || ''}
                  onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
                  disabled={systemLinked}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </BaseNode>
  );
});
