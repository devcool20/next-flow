import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import { memo, useState } from 'react';

type NodeData = Record<string, unknown>;

export const LLMNode = memo(function LLMNode({ id, data, selected }: { id: string, data: NodeData, selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);
  const [expanded, setExpanded] = useState(true);
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
          value={(data.model as string) || 'gemini-1.5-flash'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
        </select>
        <textarea
          className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors min-h-[56px] dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
          placeholder={systemLinked ? 'system prompt linked' : 'System prompt (optional)'}
          value={(data.systemPrompt as string) || ''}
          onChange={(e) => updateNodeData(id, { systemPrompt: e.target.value })}
          disabled={systemLinked}
        />
        <textarea
          className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors min-h-[72px] dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
          placeholder={userLinked ? 'user prompt linked' : 'User message'}
          value={(data.userMessage as string) || ''}
          onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
          disabled={userLinked}
        />
        <input
          className="w-full bg-neutral-100 border border-neutral-200 rounded-md p-2 text-xs text-neutral-800 focus:outline-none focus:border-neutral-400 transition-colors dark:bg-[#1A1A1A] dark:border-[#333] dark:text-gray-300 dark:focus:border-[#555]"
          placeholder={imagesLinked ? 'images linked from upstream' : 'Image URL(s), comma-separated (optional)'}
          value={(data.imagesInput as string) || ''}
          onChange={(e) => updateNodeData(id, { imagesInput: e.target.value })}
          disabled={imagesLinked}
        />

        {/* Output Area */}
        {Boolean(data.output) && (
          <div className="mt-2 border border-neutral-200 rounded-md overflow-hidden bg-neutral-50 dark:border-[#333] dark:bg-[#151515]">
            <div 
              className="flex items-center justify-between p-2 bg-neutral-200 border-b border-neutral-300 cursor-pointer hover:bg-neutral-300 transition-colors dark:bg-[#222] dark:border-[#333] dark:hover:bg-[#2a2a2a]"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Response</span>
              {expanded ? <ChevronUp size={14} className="text-gray-500 dark:text-gray-400" /> : <ChevronDown size={14} className="text-gray-500 dark:text-gray-400" />}
            </div>
            
            {expanded && (
              <div className="p-3 text-sm text-neutral-800 max-h-[300px] overflow-y-auto prose prose-sm dark:prose-invert dark:text-gray-300">
                <ReactMarkdown>{String(data.output)}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
});
