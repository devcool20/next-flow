'use client';
import { clsx } from 'clsx';
import { useMemo } from 'react';
import { useWorkflowStore } from '@/lib/store';
import { Filter, History, ImageIcon, PlayCircle } from 'lucide-react';

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
  return /^(https?:\/\/|blob:)/i.test(value.trim());
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

export default function RightSidebar({ isOpen, mode }: { isOpen: boolean; mode: RightSidebarMode }) {
  const nodes = useWorkflowStore((state) => state.nodes);
  const history = useWorkflowStore((state) => state.history);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const activeRunId = useWorkflowStore((state) => state.activeRunId);
  const runWorkflow = useWorkflowStore((state) => state.runWorkflow);
  const runSelectedWorkflow = useWorkflowStore((state) => state.runSelectedWorkflow);
  const selectHistoryRun = useWorkflowStore((state) => state.selectHistoryRun);

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
        'relative z-20 flex flex-col border-l border-[#222222] bg-[#0b0d10] transition-all duration-300',
        isOpen ? 'w-[22rem]' : 'w-0 overflow-hidden'
      )}
    >
      <div className="flex min-w-[22rem] items-center justify-between border-b border-[#1f242b] px-4 py-4">
        <div className="flex items-center gap-2 text-[#e5ebf6]">
          {mode === 'assets' ? <ImageIcon className="h-4 w-4" /> : <History className="h-4 w-4" />}
          <span className="text-sm font-semibold">{mode === 'assets' ? 'Asset History' : 'Version History'}</span>
        </div>
      </div>

      <div className="custom-scrollbar flex min-w-[22rem] flex-1 flex-col overflow-y-auto p-4">
        {mode === 'assets' ? (
          <AssetHistoryView assets={assets} />
        ) : (
          <VersionHistoryView
            history={history}
            activeRunId={activeRunId}
            activeRun={activeRun}
            isRunning={isRunning}
            runWorkflow={runWorkflow}
            runSelectedWorkflow={runSelectedWorkflow}
            selectHistoryRun={selectHistoryRun}
          />
        )}
      </div>
    </aside>
  );
}

function AssetHistoryView({ assets }: { assets: AssetEntry[] }) {
  if (assets.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-left">
        <p className="text-base leading-6 text-[#8d95a5]">
          Results will appear here as nodes begin to generate outputs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {assets.map((asset) => (
        <article key={asset.id} className="overflow-hidden rounded-2xl border border-[#2a2f37] bg-[#161a1f]">
          <div className="relative h-40 w-full bg-[#0f1216]">
            {asset.kind === 'video' ? (
              <video src={asset.url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.url} alt={asset.source} className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <p className="truncate text-xs font-medium text-[#e4ebf8]">{asset.source}</p>
            <p className="text-[11px] text-[#8592a8]">
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
  runWorkflow,
  runSelectedWorkflow,
  selectHistoryRun,
}: {
  history: ReturnType<typeof useWorkflowStore.getState>['history'];
  activeRunId: string | null;
  activeRun: ReturnType<typeof useWorkflowStore.getState>['history'][number] | null;
  isRunning: boolean;
  runWorkflow: () => Promise<void>;
  runSelectedWorkflow: () => Promise<void>;
  selectHistoryRun: (runId: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => void runWorkflow()}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#313844] bg-[#1a1f26] py-2 text-xs font-semibold text-[#e6edf9] transition-colors hover:bg-[#242a33] disabled:opacity-50"
        >
          <PlayCircle size={14} />
          Run Workflow
        </button>
        <button
          onClick={() => void runSelectedWorkflow()}
          disabled={isRunning}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#313844] bg-[#1a1f26] py-2 text-xs font-semibold text-[#e6edf9] transition-colors hover:bg-[#242a33] disabled:opacity-50"
        >
          <Filter size={14} />
          Run Selected
        </button>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-[#2a2f37] bg-[#15191f] p-4 text-sm text-[#929caf]">
          No versions yet.
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {history.map((run) => (
              <button
                key={run.id}
                onClick={() => selectHistoryRun(run.id)}
                className={clsx(
                  'w-full rounded-2xl border p-3 text-left transition-colors',
                  run.id === activeRunId ? 'border-[#4b9cff] bg-[#1a2433]' : 'border-[#2a2f37] bg-[#161a1f] hover:bg-[#1d222a]'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-black/35 px-2 py-0.5 text-xs text-[#e6edf9]">
                    {formatRelativeTime(run.startedAt)}
                  </span>
                  {run.id === activeRunId && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">CURRENT</span>
                  )}
                </div>
                <div className="relative mt-3 h-32 overflow-hidden rounded-xl bg-gradient-to-b from-[#30343a] to-[#1f2328]">
                  <div className="absolute left-3 top-6 h-10 w-12 rounded bg-black/70" />
                  <div className="absolute left-8 top-16 h-12 w-16 rounded bg-black/75" />
                  <div className="absolute right-4 top-4 h-24 w-11 rounded bg-black/80" />
                </div>
                <p className="mt-2 text-xs text-[#9ca7bb]">
                  {run.nodeRuns.length} node{run.nodeRuns.length === 1 ? '' : 's'} • {run.status}
                </p>
              </button>
            ))}
          </div>

          {activeRun && (
            <div className="rounded-2xl border border-[#2a2f37] bg-[#141920] p-3">
              <p className="text-xs font-semibold text-[#e6edf9]">Run Details</p>
              <div className="custom-scrollbar mt-2 max-h-52 space-y-2 overflow-y-auto">
                {activeRun.nodeRuns.map((nodeRun) => (
                  <div key={`${activeRun.id}-${nodeRun.nodeId}`} className="rounded-lg border border-[#2a2f37] bg-[#1a1f26] p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#e6edf9]">{nodeRun.title}</span>
                      <span
                        className={clsx(
                          nodeRun.status === 'success' && 'text-emerald-400',
                          nodeRun.status === 'running' && 'text-yellow-400',
                          nodeRun.status === 'error' && 'text-red-400'
                        )}
                      >
                        {nodeRun.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
