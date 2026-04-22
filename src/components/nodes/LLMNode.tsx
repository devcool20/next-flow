import { Brain, Copy } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import { memo } from 'react';
import { Tooltip } from '../shared/Tooltip';

type NodeData = Record<string, unknown>;

export const LLMNode = memo(function LLMNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);
  const systemLinked = hasInputConnection(id, 'system_prompt');
  const userLinked = hasInputConnection(id, 'user_message');
  const imagesLinked = hasInputConnection(id, 'images');

  return (
    <BaseNode
      id={id}
      title="Run Any LLM"
      icon={<Brain size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected || Boolean(data.highlighted)}
      className="w-[380px]"
      inputs={[
        { id: 'system_prompt', label: 'system' },
        { id: 'user_message', label: 'user' },
        { id: 'images', label: 'image(s)' }
      ]}
      outputs={[
        { id: 'output', label: 'response' }
      ]}
    >
      <div className="flex flex-col gap-3">
        {/* Model Selector */}
        <select
          className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-sm text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors appearance-none dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
          value={(data.model as string) || 'gemini-2.5-flash'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
        
        <div className={systemLinked ? "opacity-50 pointer-events-none" : ""}>
          <textarea
            className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors min-h-[56px] dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
            placeholder={systemLinked ? 'system prompt linked' : 'System prompt (optional)'}
            value={(data.systemPrompt as string) || ''}
            onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
            disabled={systemLinked}
          />
        </div>
        
        <div className={userLinked ? "opacity-50 pointer-events-none" : ""}>
          <textarea
            className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors min-h-[72px] dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
            placeholder={userLinked ? 'user prompt linked' : 'User message'}
            value={(data.userMessage as string) || ''}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            disabled={userLinked}
          />
        </div>
        
        <div className={imagesLinked ? "opacity-50 pointer-events-none" : ""}>
          <input
            className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
            placeholder={imagesLinked ? 'images linked from upstream' : 'Image URL(s), comma-separated (optional)'}
            value={(data.imagesInput as string) || ''}
            onChange={(e) => updateNodeData(id, { imagesInput: e.target.value })}
            disabled={imagesLinked}
          />
        </div>

        {/* Output Area */}
        {Boolean(data.output) && (
          <div className="mt-2 p-3 bg-neutral-100 dark:bg-white/5 rounded-lg border border-neutral-200 dark:border-white/10 animate-in fade-in slide-in-from-top-1 group/output">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-white/40">Response</span>
              <Tooltip content="Copy response" side="top">
                <button
                  className="rounded p-1 hover:bg-black/10 hover:text-neutral-900 dark:hover:bg-white/10 dark:hover:text-white transition-colors opacity-0 group-hover/output:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(String(data.output));
                  }}
                >
                  <Copy size={12} />
                </button>
              </Tooltip>
            </div>
            <div className="text-sm font-sans text-neutral-800 dark:text-white/90 prose dark:prose-invert max-w-none">
              <ReactMarkdown>{String(data.output)}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </BaseNode>
  );
});
