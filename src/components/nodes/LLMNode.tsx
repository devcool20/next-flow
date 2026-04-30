import { Brain, ChevronDown, ChevronRight, Pencil, Image as ImageIcon, Copy, Check } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '@/lib/store';
import ReactMarkdown from 'react-markdown';
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react';

type NodeData = Record<string, unknown>;
type HandleTopState = {
  output: number;
  user_message: number;
  images: number;
  system_prompt: number;
};

const DEFAULT_TOPS: HandleTopState = {
  output: 264,
  user_message: 274,
  images: 412,
  system_prompt: 512,
};

export const LLMNode = memo(function LLMNode({ id, data, selected }: { id: string; data: NodeData; selected?: boolean }) {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const hasInputConnection = useWorkflowStore((state) => state.hasInputConnection);
  const systemLinked = hasInputConnection(id, 'system_prompt');
  const userLinked = hasInputConnection(id, 'user_message');
  const imagesLinked = hasInputConnection(id, 'images');

  const [isSettingsOpen, setIsSettingsOpen] = useState(true);
  const [tops, setTops] = useState<HandleTopState>(DEFAULT_TOPS);
  const [copied, setCopied] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const outputLabelRef = useRef<HTMLDivElement | null>(null);
  const promptRowRef = useRef<HTMLDivElement | null>(null);
  const imageRowRef = useRef<HTMLDivElement | null>(null);
  const settingsRowRef = useRef<HTMLButtonElement | null>(null);
  const systemPromptRowRef = useRef<HTMLDivElement | null>(null);

  const getCenterTop = useCallback((root: HTMLElement, target: HTMLElement | null, fallback: number) => {
    if (!target || !root) return fallback;
    const rootRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    
    // Account for canvas scale/zoom
    // We want the position in node-local coordinates (unscaled)
    const scale = rootRect.height / root.offsetHeight;
    if (scale === 0) return fallback;
    
    const relativeTop = (targetRect.top - rootRect.top) / scale;
    const relativeHeight = targetRect.height / scale;
    
    return relativeTop + relativeHeight / 2;
  }, []);

  const getHandleRoot = useCallback(() => {
    return contentRef.current?.closest('[data-handle-root="true"]') as HTMLElement | null;
  }, []);

  const recalculateHandleTops = useCallback(() => {
    const root = getHandleRoot();
    if (!root) return;

    const systemTarget = isSettingsOpen ? systemPromptRowRef.current : settingsRowRef.current;
    const nextTops: HandleTopState = {
      output: getCenterTop(root, outputLabelRef.current, DEFAULT_TOPS.output),
      user_message: getCenterTop(root, promptRowRef.current, DEFAULT_TOPS.user_message),
      images: getCenterTop(root, imageRowRef.current, DEFAULT_TOPS.images),
      system_prompt: getCenterTop(root, systemTarget, DEFAULT_TOPS.system_prompt),
    };

    setTops((prev) => {
      if (
        prev.output === nextTops.output &&
        prev.user_message === nextTops.user_message &&
        prev.images === nextTops.images &&
        prev.system_prompt === nextTops.system_prompt
      ) {
        return prev;
      }
      return nextTops;
    });
  }, [getCenterTop, getHandleRoot, isSettingsOpen]);

  useLayoutEffect(() => {
    recalculateHandleTops();
  }, [recalculateHandleTops, data.output, data.userMessage, data.systemPrompt, isSettingsOpen]);

  useLayoutEffect(() => {
    const root = getHandleRoot();
    if (!root || typeof ResizeObserver === 'undefined') return;

    let rafId: number | null = null;
    const scheduleRecalc = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        recalculateHandleTops();
      });
    };

    const observer = new ResizeObserver(scheduleRecalc);
    observer.observe(root);
    if (contentRef.current) observer.observe(contentRef.current);
    if (systemPromptRowRef.current) observer.observe(systemPromptRowRef.current);

    return () => {
      observer.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [getHandleRoot, id, recalculateHandleTops, isSettingsOpen]);

  const inputs = [
    { id: 'user_message', label: 'user', top: tops.user_message },
    { id: 'images', label: 'image(s)', className: 'handle-blue', top: tops.images },
    { id: 'system_prompt', label: 'system', top: tops.system_prompt },
  ];

  return (
    <BaseNode
      id={id}
      type="llm"
      title={String(data.label || 'LLM')}
      icon={<Brain size={16} />}
      status={(data.status as 'idle' | 'running' | 'success' | 'error') || 'idle'}
      selected={selected}
      highlighted={Boolean(data.highlighted)}
      className="w-[340px]"
      inputs={inputs}
      outputs={[{ id: 'output', label: 'response', top: tops.output }]}
    >
      <div className="relative flex flex-col" ref={contentRef}>
        <div className="group/output relative mb-2 w-full">
          <div className="custom-scrollbar max-h-[145px] min-h-[145px] w-full overflow-y-auto rounded-md bg-neutral-100 p-4 text-[14px] font-normal text-neutral-800 dark:bg-[#1A1A1A] dark:text-white transition-all duration-200">
            {data.status === 'running' ? (
              <div className="flex flex-col gap-3">
                <div className="h-4 w-3/4 animate-pulse rounded bg-black/5 dark:bg-white/5"></div>
                <div className="h-4 w-full animate-pulse rounded bg-black/5 dark:bg-white/5"></div>
                <div className="h-4 w-5/6 animate-pulse rounded bg-black/5 dark:bg-white/5"></div>
                <div className="h-4 w-2/3 animate-pulse rounded bg-black/5 dark:bg-white/5"></div>
              </div>
            ) : data.output ? (
              <div className="prose max-w-none dark:prose-invert prose-p:leading-relaxed prose-sm">
                <ReactMarkdown>{String(data.output).replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
            ) : (
              <span className="text-neutral-400 dark:text-white/20 italic">No output yet</span>
            )}
          </div>

          {/* Floating Copy Button */}
          {Boolean(data.output) && data.status !== 'running' && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(String(data.output));
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="absolute right-2 top-2 opacity-0 group-hover/output:opacity-100 transition-opacity p-2 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10 backdrop-blur-md text-neutral-500 dark:text-white/40 flex items-center gap-1.5 text-[11px] font-bold"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center justify-end pr-1" ref={outputLabelRef}>
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Output</span>
        </div>

        <div className="mb-2 flex items-center gap-2" ref={promptRowRef}>
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Prompt</span>
          <Pencil size={12} className="text-neutral-500 dark:text-white/20" />
        </div>

        <div className={userLinked ? 'pointer-events-none mb-3 opacity-50' : 'mb-3'}>
          <textarea
            className="min-h-[100px] w-full resize-none overflow-hidden rounded-md bg-neutral-100 p-3 text-[13px] font-light text-neutral-800 transition-colors placeholder:text-neutral-400 focus:outline-none dark:bg-[#1A1A1A] dark:text-white/80 dark:placeholder:text-white/20"
            placeholder={userLinked ? 'user prompt linked' : 'hi'}
            value={(data.userMessage as string) || ''}
            onChange={(e) => updateNodeData(id, { userMessage: e.target.value })}
            disabled={userLinked}
          />
        </div>

        <div className="mb-4 flex items-center gap-3" ref={imageRowRef}>
          <span className="text-[13px] text-neutral-500 dark:text-white/40">Image</span>
          <div className={imagesLinked ? 'pointer-events-none flex-1 opacity-50' : 'flex-1'}>
            <div className="flex w-full cursor-text items-center justify-between rounded-md bg-neutral-100 px-3 py-1.5 dark:bg-[#111111]">
              <span className="text-[13px] text-neutral-500 dark:text-white/40">Add file</span>
              <ImageIcon size={12} className="text-neutral-500 dark:text-white/20" />
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <button
            ref={settingsRowRef}
            onClick={() => setIsSettingsOpen((prev) => !prev)}
            className="mb-2 flex w-max items-center gap-1.5 text-[13px] text-neutral-500 transition-colors hover:text-neutral-700 dark:text-white/40 dark:hover:text-white/60"
          >
            {isSettingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Settings</span>
          </button>

          {isSettingsOpen && (
            <div className="animate-in slide-in-from-top-1 fade-in flex flex-col gap-3 pl-1">
              <div className="flex items-center gap-3">
                <span className="w-[45px] text-[13px] text-neutral-500 dark:text-white/40">Model</span>
                <select
                  className="flex-1 appearance-none rounded-md bg-neutral-100 p-1.5 px-3 text-[13px] font-medium text-neutral-800 transition-colors focus:outline-none dark:bg-[#111111] dark:text-white"
                  value={(data.model as string) || 'gemini-2.5-flash'}
                  onChange={(e) => updateNodeData(id, { model: e.target.value })}
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </select>
              </div>

              <div className={systemLinked ? 'pointer-events-none flex flex-col gap-1 opacity-50' : 'flex flex-col gap-1'}>
                <div className="flex items-center gap-2" ref={systemPromptRowRef}>
                  <span className="text-[13px] text-neutral-500 dark:text-white/40">System Prompt</span>
                  <Pencil size={12} className="text-neutral-500 dark:text-white/20" />
                </div>
                <textarea
                  className="min-h-[60px] w-full resize-none overflow-hidden rounded-md bg-neutral-100 p-3 text-[13px] font-light text-neutral-800 transition-colors focus:outline-none dark:bg-[#111111] dark:text-white/80"
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
