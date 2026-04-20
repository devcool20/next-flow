import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';

export function LLMNode({ id, data }: { id: string, data: any }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const [expanded, setExpanded] = useState(true);

  return (
    <BaseNode
      id={id}
      title="Run Any LLM"
      icon={<Brain size={16} />}
      status={data.status || 'idle'}
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
          className="w-full bg-[#1A1A1A] border border-[#333] rounded-md p-2 text-sm text-gray-300 focus:outline-none focus:border-[#555] transition-colors appearance-none"
          value={data.model || 'gemini-1.5-flash'}
          onChange={(e) => updateNodeData(id, { model: e.target.value })}
        >
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
        </select>

        {/* Output Area */}
        {data.output && (
          <div className="mt-2 border border-[#333] rounded-md overflow-hidden bg-[#151515]">
            <div 
              className="flex items-center justify-between p-2 bg-[#222] border-b border-[#333] cursor-pointer hover:bg-[#2a2a2a] transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              <span className="text-xs font-semibold text-emerald-400">Response</span>
              {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
            </div>
            
            {expanded && (
              <div className="p-3 text-sm text-gray-300 max-h-[300px] overflow-y-auto prose prose-invert prose-sm">
                <ReactMarkdown>{data.output}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}
