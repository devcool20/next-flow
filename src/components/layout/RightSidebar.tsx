'use client';
import { memo, useState, useMemo } from 'react';
import type { Node } from '@xyflow/react';
import { History, ImageIcon, CheckCircle2, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useWorkflowStore } from '@/lib/store';
import type { WorkflowRun, ThemeMode } from '@/lib/store';
import type { NodeRunRecord } from '@/lib/workflow-engine';

type AssetEntry = {
  id: string;
  url: string;
  kind: 'image' | 'video' | 'file';
  source: string;
  timestamp: string;
  isCurrent?: boolean;
};

function getNodeMediaValue(node: Node): { url: string; kind: 'image' | 'video' } | null {
  const data = node.data ?? {};
  const raw =
    data.imageUrl ??
    data.image_url ??
    data.frame_url ??
    data.videoUrl ??
    data.video_url ??
    data.output;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const kind = getAssetKind(raw, String(node.type ?? data.label ?? ''));
  if (kind !== 'image' && kind !== 'video') return null;
  return { url: raw.replace(/\s/g, ''), kind };
}

function extractSnapshotAssets(nodes?: Node[], timestamp = new Date().toISOString(), isCurrent = false): AssetEntry[] {
  if (!nodes?.length) return [];
  return nodes.flatMap((node) => {
    const media = getNodeMediaValue(node);
    if (!media) return [];
    return {
      id: `${isCurrent ? 'current' : 'snapshot'}-${node.id}-${media.kind}`,
      url: media.url,
      kind: media.kind,
      source: String(node.data?.label ?? node.type ?? 'Node'),
      timestamp,
      isCurrent,
    };
  });
}

function extractUrls(nodeRuns: NodeRunRecord[], currentNodes: Node[]): AssetEntry[] {
  const assets: AssetEntry[] = [];
  assets.push(...extractSnapshotAssets(currentNodes, new Date().toISOString(), true));
  nodeRuns.forEach((run) => {
    const outputs = run.outputs || {};
    Object.entries(outputs).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const type = getAssetKind(value, key);
        if (type !== 'file') {
          assets.push({
            id: `${run.nodeId}-${key}-${run.finishedAt}`,
            url: value.replace(/\s/g, ''),
            kind: type,
            source: run.title,
            timestamp: run.finishedAt,
          });
        }
      }
    });
  });
  return assets.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function getAssetKind(url: string, source: string): 'image' | 'video' | 'file' {
  if (/^data:video\//i.test(url)) return 'video';
  if (/^data:image\//i.test(url)) return 'image';
  if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) || /video/i.test(source)) return 'video';
  if (/\.(jpg|jpeg|png|webp|gif|bmp|avif|svg)(\?|$)/i.test(url) || /image|crop|frame/i.test(source)) return 'image';
  return 'file';
}

function formatRelativeTime(dateIso: string) {
  const timestamp = Date.parse(dateIso);
  if (Number.isNaN(timestamp)) return 'Just now';
  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

async function openAssetUrl(url: string) {
  if (!url.startsWith('data:')) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  window.open(objectUrl, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function renderFormattedValue(value: string, allowPreview: boolean = true, theme: ThemeMode = 'dark', fallbackAsset?: AssetEntry | null) {
  const trimmed = value.trim();
  const isOmitted = trimmed.includes('[omitted');
  const isTruncated = trimmed.includes('[truncated:');
  const cleanData = trimmed.replace(/\s/g, '');
  const isValidBase64 = cleanData.length > 50;

  if ((isOmitted || isTruncated) && fallbackAsset) {
    return <MediaPreview asset={fallbackAsset} theme={theme} compact />;
  }

  if (/^data:image\/[a-z]+;base64,/i.test(cleanData) || isTruncated || isOmitted) {
    if (!allowPreview) {
      if (isOmitted || isTruncated) return <span className={clsx('italic', theme === 'dark' ? 'text-white/40' : 'text-[#888888]')}>Data too large to display</span>;
      return <span className={clsx('break-all', theme === 'dark' ? 'text-white/60' : 'text-[#666666]')}>{trimmed.slice(0, 100)}{trimmed.length > 100 ? '...' : ''}</span>;
    }
    return [
      <span key="label" className={clsx(theme === 'dark' ? 'text-white/80' : 'text-[#444444]')}>{isOmitted ? 'Redacted' : isTruncated ? 'Truncated' : 'Image'}</span>,
      <div key="preview" className={clsx('my-1.5 h-24 w-40 overflow-hidden rounded-lg border bg-black/20', theme === 'dark' ? 'border-white/10' : 'border-black/5')}>
        {!isOmitted && !isTruncated && isValidBase64 ? (
          <img src={cleanData} alt="Run output preview" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] font-bold uppercase text-amber-400/50">Large Payload</div>
        )}
      </div>
    ];
  }

  const parts = value.split(/((?:https?:\/\/[^\s"']+)|(?:data:image\/[a-z]+;base64,[A-Za-z0-9+/= \n\r]+))/g);
  return parts.map((part, i) => {
    if (!part) return null;
    const cleanPart = part.trim();
    const isUrl = cleanPart.match(/https?:\/\/[^\s"']+/);
    if (isUrl) {
      const isImage = allowPreview && /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg|tiff)(\?|$)/i.test(cleanPart);
      return (
        <div key={i} className="my-1 flex flex-col gap-1">
          <a href={cleanPart} target="_blank" rel="noreferrer" className="text-blue-500 underline break-all text-[11px] font-medium">{cleanPart}</a>
          {isImage && (
            <div className={clsx('h-24 w-40 overflow-hidden rounded-lg border bg-black/20', theme === 'dark' ? 'border-white/10' : 'border-black/5')}>
              <img src={cleanPart} alt="Run output preview" className="h-full w-full object-cover" />
            </div>
          )}
        </div>
      );
    }
    return <span key={i} className="break-words">{part}</span>;
  });
}

function MediaPreview({ asset, theme, compact = false }: { asset: AssetEntry; theme: ThemeMode; compact?: boolean }) {
  return (
    <div className={clsx('group overflow-hidden rounded-xl border', theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-black/5 bg-black/[0.02]')}>
      <div className={clsx('w-full bg-black/20', compact ? 'h-24' : 'aspect-video')}>
        {asset.kind === 'video' ? (
          <video src={asset.url} className="h-full w-full object-cover" controls preload="metadata" />
        ) : (
          <button type="button" onClick={() => void openAssetUrl(asset.url)} className="block h-full w-full" aria-label={`Open ${asset.source} preview`}>
            <img src={asset.url} alt={asset.source} className="h-full w-full object-cover" />
          </button>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-2">
        <span className={clsx('truncate text-[11px] font-bold', theme === 'dark' ? 'text-white/60' : 'text-[#111111]')}>{asset.source}</span>
        <div className="flex shrink-0 items-center gap-2">
          {asset.isCurrent && <span className={clsx('text-[9px] font-bold uppercase', theme === 'dark' ? 'text-white/30' : 'text-[#999999]')}>Current</span>}
          {asset.kind === 'image' && (
            <button type="button" onClick={() => void openAssetUrl(asset.url)} className={clsx('rounded p-1 transition-colors', theme === 'dark' ? 'text-white/35 hover:bg-white/5 hover:text-white' : 'text-[#999999] hover:bg-black/5 hover:text-[#111111]')} aria-label={`Open ${asset.source}`}>
              <ExternalLink size={12} />
            </button>
          )}
          {!asset.isCurrent && <span className={clsx('text-[10px] font-medium', theme === 'dark' ? 'text-white/30' : 'text-[#999999]')}>{formatRelativeTime(asset.timestamp)}</span>}
        </div>
      </div>
    </div>
  );
}

const NodeRunItem = memo(function NodeRunItem({ nodeRun, theme, snapshotAsset }: { nodeRun: NodeRunRecord; theme: ThemeMode; snapshotAsset?: AssetEntry | null }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isSuccess = nodeRun.status === 'success';
  const isRunning = nodeRun.status === 'running' || nodeRun.status === 'queued';
  const duration = ((new Date(nodeRun.finishedAt).getTime() - new Date(nodeRun.startedAt).getTime()) / 1000).toFixed(1);

  return (
    <div className="group relative pl-4 pb-3 last:pb-0">
      <div className={clsx('absolute left-0 top-0 h-full w-[1px]', theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.06]')} />
      <div className={clsx('absolute left-0 top-2.5 h-[1px] w-3', theme === 'dark' ? 'bg-white/5' : 'bg-black/[0.06]')} />
      
      <div className="flex flex-col gap-1 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2">
          <span className={clsx('text-[12px] font-bold', theme === 'dark' ? 'text-white/90' : 'text-[#111111]')}>{nodeRun.title}</span>
          {isSuccess ? <CheckCircle2 size={12} className="text-emerald-500" /> : isRunning ? <Clock size={12} className="text-amber-500 animate-pulse" /> : <AlertCircle size={12} className="text-red-500" />}
          <span className={clsx('text-[10px] font-medium', theme === 'dark' ? 'text-white/30' : 'text-[#999999]')}>{duration}s</span>
        </div>
        
        {!isExpanded ? (
          <div className={clsx('pl-3 border-l italic text-[11px] truncate', theme === 'dark' ? 'border-white/5 text-white/50' : 'border-black/[0.03] text-[#666666]')}>
            {(() => {
              if (nodeRun.error) {
                return <span className="text-red-500">{nodeRun.error}</span>;
              }
              const out = nodeRun.outputs ?? {};
              const val = out.output || out.image_url || out.imageUrl || out.frame_url || out.video_url || '...';
              const allowPreview = ['image', 'video', 'crop', 'extract', 'frame'].includes(nodeRun.type || '');
              return renderFormattedValue(String(val), allowPreview, theme, snapshotAsset);
            })()}
          </div>
        ) : (
          <div className="pl-3 pt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div>
              {nodeRun.error && (
                <div className={clsx('mb-2 rounded border p-2 text-[10px]', theme === 'dark' ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-red-500/20 bg-red-50 text-red-600')}>
                  {nodeRun.error}
                </div>
              )}
              <p className={clsx('text-[9px] font-bold uppercase mb-1', theme === 'dark' ? 'text-white/30' : 'text-[#888888]')}>Outputs</p>
              <pre className={clsx('p-2 rounded border text-[10px] font-mono overflow-auto max-h-32', theme === 'dark' ? 'bg-black/40 border-white/5 text-white/70' : 'bg-black/[0.02] border-black/[0.05] text-[#333333]')}>
                {JSON.stringify(nodeRun.outputs, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

const SnapshotMediaStrip = memo(function SnapshotMediaStrip({ nodes, startedAt, theme }: { nodes?: Node[]; startedAt: string; theme: ThemeMode }) {
  const assets = useMemo(() => extractSnapshotAssets(nodes, startedAt), [nodes, startedAt]);
  if (assets.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {assets.slice(0, 4).map((asset) => (
        <MediaPreview key={asset.id} asset={asset} theme={theme} />
      ))}
    </div>
  );
});

const CanvasPreview = memo(function CanvasPreview({ nodes, theme }: { nodes?: Node[]; theme: ThemeMode }) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl bg-black/20 text-[11px] font-bold text-neutral-500 uppercase tracking-widest opacity-40">
        No preview
      </div>
    );
  }

  // Calculate bounding box
  const minX = Math.min(...nodes.map(n => n.position.x));
  const minY = Math.min(...nodes.map(n => n.position.y));
  const maxX = Math.max(...nodes.map(n => n.position.x + (n.width || 200)));
  const maxY = Math.max(...nodes.map(n => n.position.y + (n.height || 100)));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return (
    <div className={clsx('aspect-video w-full rounded-xl p-4 overflow-hidden relative', theme === 'dark' ? 'bg-black/40' : 'bg-black/[0.03]')}>
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="relative w-full h-full">
          {nodes.map((node) => {
            const left = ((node.position.x - minX) / (width || 1)) * 100;
            const top = ((node.position.y - minY) / (height || 1)) * 100;
            const nodeWidth = ((node.width || 120) / (width || 1)) * 100;
            const nodeHeight = ((node.height || 60) / (height || 1)) * 100;
            
            return (
              <div 
                key={node.id}
                className={clsx(
                  'absolute rounded-sm border transition-all duration-500',
                  theme === 'dark' ? 'bg-white/10 border-white/5' : 'bg-black/10 border-black/5'
                )}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${Math.max(nodeWidth, 8)}%`,
                  height: `${Math.max(nodeHeight, 12)}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

const VersionHistoryCard = memo(function VersionHistoryCard({ run, isActive, theme }: { run: WorkflowRun; isActive: boolean; theme: ThemeMode }) {
  const { selectHistoryRun, restoreRunVersion } = useWorkflowStore();
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const isRunning = run.status === 'running' || run.status === 'queued';
  const snapshotAssetsByNodeId = useMemo(() => {
    const entries = new Map<string, AssetEntry>();
    for (const node of run.nodesSnapshot ?? []) {
      const media = getNodeMediaValue(node);
      if (!media) continue;
      entries.set(node.id, {
        id: `node-run-snapshot-${node.id}-${media.kind}`,
        url: media.url,
        kind: media.kind,
        source: String(node.data?.label ?? node.type ?? 'Node'),
        timestamp: run.startedAt,
      });
    }
    return entries;
  }, [run.nodesSnapshot, run.startedAt]);

  return (
    <div 
      onClick={() => selectHistoryRun(run.id)}
      className={clsx(
        'group flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-300 cursor-pointer',
        isActive 
          ? theme === 'dark' 
            ? 'border-white/10 bg-white/[0.03] shadow-xl' 
            : 'border-black/5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
          : theme === 'dark'
            ? 'border-white/[0.03] hover:bg-white/[0.01] hover:border-white/5'
            : 'border-transparent hover:bg-black/[0.02] hover:border-black/5'
      )}
    >
      <div className="flex items-center justify-between">
        <span className={clsx('text-[11px] font-bold', theme === 'dark' ? 'text-white/40' : 'text-[#666666]')}>
          {formatRelativeTime(run.startedAt)}
        </span>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className={clsx('px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter', theme === 'dark' ? 'bg-white/10 text-white/60' : 'bg-black/5 text-black/40')}>
              Current
            </span>
          )}
          {!isRunning && (
            <button 
              onClick={(e) => { e.stopPropagation(); setShowRestoreModal(true); }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all opacity-0 group-hover:opacity-100',
                theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-black/[0.04] hover:bg-black/[0.08] text-[#111111]'
              )}
            >
              Restore
            </button>
          )}
        </div>
      </div>

      <CanvasPreview nodes={run.nodesSnapshot} theme={theme} />
      <SnapshotMediaStrip nodes={run.nodesSnapshot as Node[] | undefined} startedAt={run.startedAt} theme={theme} />

      <div className="flex items-center justify-between">
        <div className={clsx('text-[11px] font-bold opacity-40', theme === 'dark' ? 'text-white' : 'text-black')}>
          {run.nodesSnapshot?.length || run.nodeRuns.length} nodes · {run.edgesSnapshot?.length || 0} edges
        </div>
        <div className={clsx('h-1.5 w-1.5 rounded-full', run.status === 'success' ? 'bg-emerald-500' : isRunning ? 'bg-amber-500 animate-pulse' : 'bg-red-500')} />
      </div>

      {isActive && run.nodeRuns.length > 0 && (
        <div className={clsx('mt-2 border-t pt-3 space-y-1', theme === 'dark' ? 'border-white/5' : 'border-black/[0.05]')}>
          {run.nodeRuns.map(nr => <NodeRunItem key={nr.nodeId} nodeRun={nr} theme={theme} snapshotAsset={snapshotAssetsByNodeId.get(nr.nodeId)} />)}
        </div>
      )}

      {isActive && run.nodeRuns.length === 0 && run.error && (
        <div className={clsx('rounded-lg border p-3 text-[11px]', theme === 'dark' ? 'border-red-500/20 bg-red-500/5 text-red-300' : 'border-red-500/20 bg-red-50 text-red-600')}>
          {run.error}
        </div>
      )}

      {showRestoreModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={e => e.stopPropagation()}>
          <div className={clsx('w-full max-w-sm rounded-2xl border p-6 shadow-2xl', theme === 'dark' ? 'border-white/10 bg-[#121212] text-white' : 'border-black/5 bg-white text-black')}>
            <h3 className="text-lg font-bold">Restore this version?</h3>
            <p className={clsx('mt-2 text-sm', theme === 'dark' ? 'opacity-50' : 'text-[#666666]')}>This will replace your current workflow with this version snapshot.</p>
            <div className="mt-6 flex gap-3">
              <button className={clsx('flex-1 rounded-xl py-2.5 font-bold', theme === 'dark' ? 'bg-white/5' : 'bg-black/5')} onClick={() => setShowRestoreModal(false)}>Cancel</button>
              <button className="flex-1 rounded-xl bg-blue-600 py-2.5 font-bold text-white" onClick={() => { restoreRunVersion(run.id); setShowRestoreModal(false); }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default function RightSidebar({ isOpen, mode, theme, currentNodes = [] }: { isOpen: boolean; mode: 'assets' | 'versions'; theme: ThemeMode; currentNodes?: Node[] }) {
  const { history, activeRunId } = useWorkflowStore();
  const assets = useMemo(() => extractUrls(history.flatMap(h => h.nodeRuns), currentNodes), [history, currentNodes]);

  return (
    <aside className={clsx(
      'relative z-20 flex flex-col border-l transition-[width] duration-[340ms] ease-out',
      theme === 'dark' ? 'border-white/5 bg-[#060606]' : 'border-neutral-200 bg-white',
      isOpen ? 'w-[22rem]' : 'w-0 overflow-hidden'
    )}>
      <div className="flex items-center justify-between p-4 pb-2">
        <div className={clsx('flex items-center gap-2 font-bold', theme === 'dark' ? 'text-white/30' : 'text-[#666666]')}>
          {mode === 'assets' ? <ImageIcon size={14} /> : <History size={14} />}
          <span className="text-[10px] uppercase tracking-widest">{mode === 'assets' ? 'Asset History' : 'Version History'}</span>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 overflow-y-auto p-4 pt-2">
        {mode === 'assets' ? (
          <div className="grid grid-cols-1 gap-3">
            {assets.map(asset => (
              <MediaPreview key={asset.id} asset={asset} theme={theme} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.map(run => <VersionHistoryCard key={run.id} run={run} isActive={run.id === activeRunId} theme={theme} />)}
          </div>
        )}
      </div>
    </aside>
  );
}
