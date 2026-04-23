'use client';
import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useWorkflowStore } from '@/lib/store';
import { Filter, History, ImageIcon, PlayCircle } from 'lucide-react';
import type { NodeRunRecord } from '@/lib/workflow-engine';

type RightSidebarMode = 'assets' | 'versions';
type AssetKind = 'image' | 'video' | 'file';
type AssetEntry = {
  id: string;
  url: string;
  kind: AssetKind;
  source: string;
  timestamp?: string;
};

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|blob:|data:image\/|data:video\/)/i.test(value.trim());
}

function extractUrls(value: unknown, collector: Set<string>) {
  if (!value) return;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (looksLikeUrl(trimmed)) {
      collector.add(trimmed);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      extractUrls(item, collector);
    }
    return;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) {
      extractUrls(item, collector);
    }
  }
}

function inferAssetKind(url: string, source: string): AssetKind {
  if (/^data:video\//i.test(url)) {
    return 'video';
  }
  if (/^data:image\//i.test(url)) {
    return 'image';
  }
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || /video/i.test(source)) {
    return 'video';
  }
  if (/\.(jpg|jpeg|png|webp|gif|bmp|avif|svg)(\?|$)/i.test(url) || /image|crop|frame/i.test(source)) {
    return 'image';
  }
  return 'file';
}

function formatRelativeTime(dateIso: string) {
  const timestamp = Date.parse(dateIso);
  if (Number.isNaN(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function renderFormattedValue(value: string) {
  const trimmed = value.trim();
  if (/^data:image\//i.test(trimmed)) {
    return [
      <span key="data-image-label">Inline image output</span>,
      <div key="data-image-preview" className="my-1.5 flex flex-col gap-1.5">
        <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-white/10 bg-black/20 shadow-inner transition-colors">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trimmed} alt="Output Preview" className="h-full w-full object-cover" />
        </div>
      </div>,
    ];
  }

  const urlRegex = /(https?:\/\/[^\s"']+)/g;
  const parts = value.split(urlRegex);
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      const isImage = /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg)(\?|$)/i.test(part) || part.includes('picsum.photos');
      
      return (
        <div key={i} className="my-1.5 flex flex-col gap-1.5">
          <a
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#4b9cff] underline decoration-[#4b9cff]/40 hover:decoration-[#4b9cff] transition-all break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
          {isImage && (
            <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-white/10 bg-black/20 shadow-inner group-hover:border-white/20 transition-colors">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={part} 
                alt="Output Preview" 
                className="h-full w-full object-cover transition-transform hover:scale-110 duration-500" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

import type { ThemeMode } from './Shell';

export default function RightSidebar({ isOpen, mode, theme = 'dark' }: { isOpen: boolean; mode: RightSidebarMode; theme?: ThemeMode }) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const history = useWorkflowStore((state) => state.history);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const activeRunId = useWorkflowStore((state) => state.activeRunId);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const runSelectedWorkflow = useWorkflowStore((state) => state.runSelectedWorkflow);
  const selectHistoryRun = useWorkflowStore((state) => state.selectHistoryRun);
  const setNodes = useWorkflowStore((state) => state.setNodes);
  void setNodes; // referenced below via getState()

  // Clear highlights when sidebar is closed
  useEffect(() => {
    if (!isOpen) {
      // Use the store's hook to get the state and update it
      const { nodes: currentNodes } = useWorkflowStore.getState();
      const hasHighlighted = currentNodes.some(n => n.data.highlighted || n.selected);
      
      if (hasHighlighted) {
        const cleared = currentNodes.map((n) => ({
          ...n,
          data: { ...n.data, highlighted: false },
          selected: false,
        }));
        useWorkflowStore.setState({ nodes: cleared, activeRunId: null });
      }
    }
  }, [isOpen]);

  const assets = useMemo(() => {
    const collected: AssetEntry[] = [];

    for (const node of nodes) {
      const urls = new Set<string>();
      extractUrls((node.data as Record<string, unknown>).imageUrl, urls);
      extractUrls((node.data as Record<string, unknown>).videoUrl, urls);
      extractUrls((node.data as Record<string, unknown>).output, urls);

      for (const url of urls) {
        collected.push({
          id: `${node.id}-${url}`,
          url,
          kind: inferAssetKind(url, String(node.type ?? 'node')),
          source: String(node.type ?? 'Node'),
        });
      }
    }

    for (const run of history) {
      for (const nodeRun of run.nodeRuns) {
        const urls = new Set<string>();
        extractUrls(nodeRun.outputs, urls);
        for (const url of urls) {
          collected.push({
            id: `${run.id}-${nodeRun.nodeId}-${url}`,
            url,
            kind: inferAssetKind(url, nodeRun.title),
            source: nodeRun.title,
            timestamp: run.startedAt,
          });
        }
      }
    }

    const deduped = new Map<string, AssetEntry>();
    for (const item of collected) {
      const existing = deduped.get(item.url);
      if (!existing) {
        deduped.set(item.url, item);
        continue;
      }
      if ((item.timestamp ?? '') > (existing.timestamp ?? '')) {
        deduped.set(item.url, item);
      }
    }

    return Array.from(deduped.values()).sort((a, b) => {
      const aTs = a.timestamp ? Date.parse(a.timestamp) : 0;
      const bTs = b.timestamp ? Date.parse(b.timestamp) : 0;
      return bTs - aTs;
    });
  }, [history, nodes]);

  const activeRun = useMemo(
    () => history.find((entry) => entry.id === activeRunId) ?? null,
    [activeRunId, history]
  );

  return (
    <aside
      className={clsx(
        'relative z-20 flex flex-col border-l transition-[width] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
        theme === 'dark'
          ? 'border-[#222222] bg-[#0b0d10]'
          : 'border-neutral-200/70 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.06)] backdrop-blur-md',
        isOpen ? 'w-[22rem]' : 'w-0 overflow-hidden'
      )}
    >
      <div className={clsx('flex min-w-[22rem] items-center justify-between border-b px-4 py-4', theme === 'dark' ? 'border-[#1f242b]' : 'border-[#e2e8f0]')}>
        <div className={clsx('flex items-center gap-2', theme === 'dark' ? 'text-[#e5ebf6]' : 'text-[#0f172a]')}>
          {mode === 'assets' ? <ImageIcon className="h-4 w-4" /> : <History className="h-4 w-4" />}
          <span className="text-sm font-semibold">{mode === 'assets' ? 'Asset History' : 'Version History'}</span>
        </div>
      </div>

      <div className="custom-scrollbar flex min-w-[22rem] flex-1 flex-col overflow-y-auto p-4">
        {mode === 'assets' ? (
          <AssetHistoryView assets={assets} theme={theme} />
        ) : (
          <VersionHistoryView
            history={history}
            activeRunId={activeRunId}
            activeRun={activeRun}
            isRunning={isRunning}
            nodes={nodes}
            runWorkflow={runWorkflow}
            runSelectedWorkflow={runSelectedWorkflow}
            selectHistoryRun={selectHistoryRun}
            theme={theme}
          />
        )}
      </div>
    </aside>
  );
}

function NodeRunItem({
  nodeRun,
  isSelected,
  theme,
}: {
  nodeRun: NodeRunRecord;
  isSelected: boolean | undefined;
  theme: ThemeMode;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const duration = ((new Date(nodeRun.finishedAt).getTime() - new Date(nodeRun.startedAt).getTime()) / 1000).toFixed(1);

  return (
    <div className="group relative pl-6 pb-4 last:pb-0">
      {/* Tree Lines */}
      <div className={clsx('absolute left-0 top-0 h-full w-[1px]', theme === 'dark' ? 'bg-[#2a2f37]' : 'bg-[#d9e2ef]')} />
      <div className={clsx('absolute left-0 top-2.5 h-[1px] w-4', theme === 'dark' ? 'bg-[#2a2f37]' : 'bg-[#d9e2ef]')} />

      <div
        className={clsx(
          'flex cursor-pointer flex-col gap-1.5 rounded-lg p-2 -ml-2 transition-all duration-200',
          theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-[#f1f5fb]',
          isSelected && (theme === 'dark' ? 'border border-white/5 bg-white/5 shadow-sm' : 'border border-[#d8e3f2] bg-[#eef4ff] shadow-sm')
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className={clsx('text-[12px] font-medium', theme === 'dark' ? 'text-[#e6edf9]' : 'text-[#0f172a]')}>{nodeRun.title}</span>
          {nodeRun.status === 'success' ? (
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
              <svg viewBox="0 0 24 24" className="h-2 w-2 fill-none stroke-current stroke-[3]" xmlns="http://www.w3.org/2000/svg">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          ) : (
            <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/20 text-red-500">
              <svg viewBox="0 0 24 24" className="h-2 w-2 fill-none stroke-current stroke-[3]" xmlns="http://www.w3.org/2000/svg">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          )}
          <span className={clsx('text-[10px]', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>{duration}s</span>
        </div>

        {/* Output/Error nesting */}
        <div className="relative pl-4 space-y-1">
          <div className={clsx('absolute left-0 top-0 h-full w-[1px] border-l border-dashed', theme === 'dark' ? 'border-[#2a2f37]' : 'border-[#d9e2ef]')} />
          <div className={clsx('absolute left-0 top-2 h-[1px] w-3 border-t border-dashed', theme === 'dark' ? 'border-[#2a2f37]' : 'border-[#d9e2ef]')} />

          {!isExpanded ? (
            nodeRun.status === 'success' ? (
              <div className={clsx('flex overflow-hidden gap-1 text-[11px]', theme === 'dark' ? 'text-[#9ca7bb]' : 'text-[#475569]')}>
                <span className={clsx('shrink-0 font-semibold', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>Output:</span>
                <span className="truncate opacity-80 italic">
                  {renderFormattedValue(
                    (() => {
                      const out = nodeRun.outputs;
                      const val = typeof out.output === 'string' ? out.output : (out.image_url || out.frame_url || out.video_url || JSON.stringify(out));
                      const isMedia = typeof val === 'string' && (val.startsWith('data:') || /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg|mp4|webm|mov)(\?|$)/i.test(val));
                      if (isMedia) return String(val);
                      return String(val).length > 80 ? String(val).slice(0, 80) + '...' : String(val);
                    })()
                  )}
                </span>
              </div>
            ) : (
              <div className="flex gap-1 text-[11px] text-red-400/80">
                <span className="shrink-0 font-semibold">Error:</span>
                <span className="truncate italic">&quot;{nodeRun.error || 'Unknown error'}&quot;</span>
              </div>
            )
          ) : (
            <div className="animate-in fade-in slide-in-from-top-1 space-y-3 pt-2 duration-200">
              <div className="space-y-1">
                <p className={clsx('text-[10px] font-bold uppercase tracking-tight', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>Inputs</p>
                <div className={clsx('custom-scrollbar max-h-48 overflow-y-auto rounded-lg border p-2 font-mono text-[11px]', theme === 'dark' ? 'border-white/5 bg-black/40 text-[#9ca7bb]' : 'border-[#dbe5f3] bg-[#f8fbff] text-[#334155]')}>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(nodeRun.inputs, null, 2)}</pre>
                </div>
              </div>
              <div className="space-y-1">
                <p className={clsx('text-[10px] font-bold uppercase tracking-tight', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>Outputs</p>
                <div className={clsx('custom-scrollbar max-h-64 overflow-y-auto rounded-lg border p-2 font-mono text-[11px]', theme === 'dark' ? 'border-white/5 bg-black/40 text-[#e6edf9]' : 'border-[#dbe5f3] bg-[#f8fbff] text-[#0f172a]')}>
                  <pre className="whitespace-pre-wrap break-words">{JSON.stringify(nodeRun.outputs, null, 2)}</pre>
                </div>
              </div>
              {nodeRun.error && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-tight text-red-400/80">Error</p>
                  <div className="whitespace-normal break-words rounded-lg border border-red-500/10 bg-red-950/20 p-2 font-mono text-[11px] leading-relaxed text-red-400">
                    {nodeRun.error}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssetHistoryView({ assets, theme }: { assets: AssetEntry[]; theme: ThemeMode }) {
  if (assets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-left">
        <p className={clsx('text-base leading-6', theme === 'dark' ? 'text-[#8d95a5]' : 'text-[#64748b]')}>
          Results will appear here as nodes begin to generate outputs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <article key={asset.id} className={clsx('overflow-hidden rounded-2xl border', theme === 'dark' ? 'border-[#2a2f37] bg-[#161a1f]' : 'border-[#dbe5f3] bg-[#f8fbff]')}>
          <div className={clsx('relative h-40 w-full', theme === 'dark' ? 'bg-[#0f1216]' : 'bg-[#eff5fd]')}>
            {asset.kind === 'video' ? (
              <video src={asset.url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.source} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className={clsx('truncate text-xs font-medium', theme === 'dark' ? 'text-[#e4ebf8]' : 'text-[#0f172a]')}>{asset.source}</p>
            <p className={clsx('text-[11px]', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>
              {asset.timestamp ? formatRelativeTime(asset.timestamp) : asset.kind}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function VersionHistoryView({
  history,
  activeRunId,
  activeRun,
  isRunning,
  nodes,
  runWorkflow,
  runSelectedWorkflow,
  selectHistoryRun,
  theme,
}: {
  history: ReturnType<typeof useWorkflowStore.getState>['history'];
  activeRunId: string | null;
  activeRun: ReturnType<typeof useWorkflowStore.getState>['history'][number] | null;
  isRunning: boolean;
  nodes: ReturnType<typeof useWorkflowStore.getState>['nodes'];
  runWorkflow: () => Promise<void>;
  runSelectedWorkflow: () => Promise<void>;
  selectHistoryRun: (runId: string) => void;
  theme: ThemeMode;
}) {
  const restoreRunVersion = useWorkflowStore((state) => state.restoreRunVersion);
  const [restoringRunId, setRestoringRunId] = useState<string | null>(null);

  const handleRunClick = (runId: string) => {
    selectHistoryRun(runId);
    setRestoringRunId(runId);
  };

  const confirmRestore = () => {
    if (restoringRunId) {
      restoreRunVersion(restoringRunId);
      setRestoringRunId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => void runWorkflow()}
          disabled={isRunning}
          className={clsx(
            'flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-colors disabled:opacity-50',
            theme === 'dark'
              ? 'border-[#313844] bg-[#1a1f26] text-[#e6edf9] hover:bg-[#242a33]'
              : 'border-[#d2ddeb] bg-white text-[#0f172a] hover:bg-[#f1f5fb]'
          )}
        >
          <PlayCircle size={14} />
          Run Workflow
        </button>
        <button
          onClick={() => void runSelectedWorkflow()}
          disabled={isRunning}
          className={clsx(
            'flex items-center justify-center gap-2 rounded-xl border py-2 text-xs font-semibold transition-colors disabled:opacity-50',
            theme === 'dark'
              ? 'border-[#313844] bg-[#1a1f26] text-[#e6edf9] hover:bg-[#242a33]'
              : 'border-[#d2ddeb] bg-white text-[#0f172a] hover:bg-[#f1f5fb]'
          )}
        >
          <Filter size={14} />
          Run Selected
        </button>
      </div>

      {activeRun && (
        <div className={clsx('rounded-2xl border p-4', theme === 'dark' ? 'border-[#2a2f37] bg-[#141920]' : 'border-[#dbe5f3] bg-white')}>
          <div className={clsx('mb-4 flex items-center justify-between border-b pb-3', theme === 'dark' ? 'border-[#2a2f37]' : 'border-[#e2e8f0]')}>
            <div className="flex flex-col gap-0.5">
              <p className={clsx('text-[13px] font-bold', theme === 'dark' ? 'text-[#e6edf9]' : 'text-[#0f172a]')}>Current Run Details</p>
              <p className={clsx('text-[10px]', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>
                {new Date(activeRun.startedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                ({activeRun.scope === 'full' ? 'Full Workflow' : activeRun.scope === 'single' ? 'Single Node' : `${activeRun.nodeRuns.length} nodes selected`})
              </p>
            </div>
          </div>

          <div className="relative space-y-0">
            {activeRun.nodeRuns.length === 0 ? (
              <p className={clsx('py-4 text-center text-[11px]', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>No nodes executed in this run</p>
            ) : (
              activeRun.nodeRuns.map((nodeRun) => (
                <NodeRunItem
                  key={nodeRun.executionId}
                  nodeRun={nodeRun}
                  isSelected={nodes.find((n) => n.id === nodeRun.nodeId)?.selected}
                  theme={theme}
                />
              ))
            )}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-3">
          <p className={clsx('text-[10px] font-bold uppercase tracking-widest', theme === 'dark' ? 'text-[#5c6471]' : 'text-[#64748b]')}>History</p>
          <div className="space-y-2">
            {history.map((run, index) => (
              <button
                key={`${run.id}-${index}`}
                onClick={() => handleRunClick(run.id)}
                className={clsx(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  run.id === activeRunId
                    ? theme === 'dark'
                      ? 'border-[#4b9cff] bg-[#1a2433]'
                      : 'border-[#4b9cff] bg-[#e9f2ff]'
                    : theme === 'dark'
                      ? 'border-[#2a2f37] bg-[#161a1f] hover:bg-[#1d222a]'
                      : 'border-[#dbe5f3] bg-white hover:bg-[#f5f8fd]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={clsx('text-[11px] font-medium', theme === 'dark' ? 'text-[#e6edf9]' : 'text-[#0f172a]')}>
                    {formatRelativeTime(run.startedAt)}
                  </span>
                  <span className={clsx(
                    "text-[10px] font-bold uppercase",
                    run.status === 'success' ? "text-emerald-500/70" : "text-red-500/70"
                  )}>
                    {run.status}
                  </span>
                </div>
                <p className={clsx('mt-1 text-[10px]', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>
                  {run.nodeRuns.length} node{run.nodeRuns.length === 1 ? '' : 's'} | {run.scope} run
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoringRunId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200', theme === 'dark' ? 'border-[#2a2f37] bg-[#141920]' : 'border-[#dbe5f3] bg-white')}>
            <h3 className={clsx('mb-2 text-lg font-semibold', theme === 'dark' ? 'text-white' : 'text-[#0f172a]')}>Restore Version?</h3>
            <p className={clsx('mb-6 text-sm', theme === 'dark' ? 'text-[#8592a8]' : 'text-[#64748b]')}>
              Do you want to replace the current screen with this version of the workflow? This will restore all node outputs and statuses from that run.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoringRunId(null)}
                className={clsx(
                  'flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors',
                  theme === 'dark' ? 'bg-[#242a33] text-white hover:bg-[#2d3540]' : 'bg-[#eef2f8] text-[#0f172a] hover:bg-[#e4ebf5]'
                )}
              >
                Cancel
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 rounded-xl bg-[#4b9cff] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#3d8be5]"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
