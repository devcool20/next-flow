'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  BackgroundVariant,
} from '@xyflow/react';
import { useWorkflowStore } from '@/lib/store';

import { TextNode } from '../nodes/TextNode';
import { ImageUploadNode } from '../nodes/ImageUploadNode';
import { VideoUploadNode } from '../nodes/VideoUploadNode';
import { CropNode } from '../nodes/CropNode';
import { ExtractFrameNode } from '../nodes/ExtractFrameNode';
import { LLMNode } from '../nodes/LLMNode';
import { Pencil, Copy, CopyPlus, Edit2, EyeOff, Trash } from 'lucide-react';

const nodeTypes = {
  text: TextNode,
  image: ImageUploadNode,
  video: VideoUploadNode,
  crop: CropNode,
  extract: ExtractFrameNode,
  llm: LLMNode,
};

type CutLine = { x1: number; y1: number; x2: number; y2: number };
const CUT_CURSOR =
  'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2222%22 height=%2222%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23ef4444%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Ccircle cx=%226%22 cy=%226%22 r=%223%22/%3E%3Ccircle cx=%226%22 cy=%2218%22 r=%223%22/%3E%3Cpath d=%22M20 4L8.1 15.9%22/%3E%3Cpath d=%22M14.5 14.5L20 20%22/%3E%3C/svg%3E") 6 4, crosshair';

function WorkflowCanvasBody({
  initialNodes,
  initialEdges,
  workflowId,
}: {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  workflowId?: string;
}) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNodeAtPosition,
    initializeWorkspace,
    fetchRuns,
    isHydrated,
    cutMode,
    interactionMode,
    removeEdgeById,
    toggleCutMode,
    duplicateSelectedNodes,
    deleteSelectedNodes,
    copySelectedNodes,
    disableSelectedNodes,
    updateNodeData,
    editingTextNodeId,
    setEditingTextNodeId,
  } = useWorkflowStore();
  const activeTextNode = nodes.find(n => n.id === editingTextNodeId);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const [contextMenu, setContextMenu] = useState<{ id: string; top: number; left: number } | null>(null);

  useEffect(() => {
    const handleGlobalClick = () => setContextMenu(null);
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);
  const { screenToFlowPosition } = useReactFlow();

  // Cut-line drag state
  const [cutLine, setCutLine] = useState<CutLine | null>(null);
  const cutDragStart = useRef<{ x: number; y: number } | null>(null);

  const toLocalPoint = useCallback((clientX: number, clientY: number) => {
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    if (isHydrated || !workflowId) return;
    initializeWorkspace({
      workflowId,
      nodes: initialNodes ?? [],
      edges: initialEdges ?? [],
    });
    void fetchRuns();
  }, [fetchRuns, initializeWorkspace, initialEdges, initialNodes, isHydrated, workflowId]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchRuns();
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addNodeAtPosition(type, position);
    },
    [screenToFlowPosition, addNodeAtPosition]
  );

  useEffect(() => {
    const onAddNode = (event: Event) => {
      const customEvent = event as CustomEvent<{ type: string }>;
      const type = customEvent.detail?.type;
      if (!type || !reactFlowWrapper.current) return;
      const rect = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      addNodeAtPosition(type, position);
    };
    window.addEventListener('nextflow:add-node', onAddNode as EventListener);
    return () => window.removeEventListener('nextflow:add-node', onAddNode as EventListener);
  }, [addNodeAtPosition, screenToFlowPosition]);

  // Determine if a cut line slices through an edge path using SVG DOM
  const findCutEdges = useCallback((line: CutLine): string[] => {
    const wrapper = reactFlowWrapper.current;
    if (!wrapper) return [];
    const rect = wrapper.getBoundingClientRect();
    const paths = wrapper.querySelectorAll<SVGPathElement>('.react-flow__edge-path');
    const sliced: string[] = [];
    for (const path of paths) {
      const len = path.getTotalLength();
      const steps = Math.min(200, Math.ceil(len));
      const matrix = path.getScreenCTM();
      if (!matrix) continue;
      for (let i = 0; i <= steps; i++) {
        const pt = path.getPointAtLength((i / steps) * len);
        const pointX = matrix.a * pt.x + matrix.c * pt.y + matrix.e - rect.left;
        const pointY = matrix.b * pt.x + matrix.d * pt.y + matrix.f - rect.top;
        // Check if pt is near the cut line segment (within 6px)
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;
        const t = Math.max(0, Math.min(1, ((pointX - line.x1) * dx + (pointY - line.y1) * dy) / lenSq));
        const nearX = line.x1 + t * dx;
        const nearY = line.y1 + t * dy;
        const dist = Math.hypot(pointX - nearX, pointY - nearY);
        if (dist < 8) {
          const edgeEl = path.closest('.react-flow__edge') as SVGGElement | null;
          const edgeId = edgeEl?.getAttribute('data-id') ?? edgeEl?.dataset?.id ?? edgeEl?.id ?? null;
          if (edgeId) {
            sliced.push(edgeId);
          }
          break;
        }
      }
    }
    return sliced;
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cutMode) return;
    // Only start cut drag on left button on the pane, not on nodes
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    const point = toLocalPoint(e.clientX, e.clientY);
    if (!point) return;
    cutDragStart.current = point;
    setCutLine({ x1: point.x, y1: point.y, x2: point.x, y2: point.y });
  }, [cutMode, toLocalPoint]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cutMode || !cutDragStart.current) return;
    const point = toLocalPoint(e.clientX, e.clientY);
    if (!point) return;
    setCutLine({ x1: cutDragStart.current.x, y1: cutDragStart.current.y, x2: point.x, y2: point.y });
  }, [cutMode, toLocalPoint]);

  const handleCanvasMouseUp = useCallback(() => {
    if (!cutMode || !cutLine || !cutDragStart.current) return;
    const line = { x1: cutDragStart.current.x, y1: cutDragStart.current.y, x2: cutLine.x2, y2: cutLine.y2 };
    const sliced = findCutEdges(line);
    sliced.forEach((id) => removeEdgeById(id));
    cutDragStart.current = null;
    setCutLine(null);
    if (sliced.length > 0) {
      toggleCutMode();
    }
  }, [cutMode, cutLine, findCutEdges, removeEdgeById, toggleCutMode]);
  const panOnDrag = interactionMode === 'pan';
  const nodesDraggable = interactionMode === 'select';
  const elementsSelectable = interactionMode === 'select';

  let canvasCursor = 'default';
  if (interactionMode === 'pan') canvasCursor = 'grab';
  if (interactionMode === 'cut') canvasCursor = CUT_CURSOR;

  return (
    <div
      className="w-full h-full relative"
      ref={reactFlowWrapper}
      style={{ cursor: cutMode && cutLine ? 'crosshair' : canvasCursor }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      {/* Red cut-line SVG overlay */}
      {cutMode && cutLine && (
        <svg
          className="pointer-events-none absolute inset-0 z-50"
          width="100%"
          height="100%"
        >
          <line
            x1={cutLine.x1}
            y1={cutLine.y1}
            x2={cutLine.x2}
            y2={cutLine.y2}
            stroke="#ef4444"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          <circle cx={cutLine.x2} cy={cutLine.y2} r={5} fill="#ef4444" opacity={0.8} />
        </svg>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        panOnDrag={panOnDrag}
        nodesDraggable={nodesDraggable}
        elementsSelectable={elementsSelectable}
        selectionOnDrag={elementsSelectable}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          setContextMenu({
            id: node.id,
            top: event.clientY,
            left: event.clientX,
          });
        }}
        onPaneClick={() => setContextMenu(null)}
        onEdgeClick={(_, edge) => {
          if (!cutMode) return;
          removeEdgeById(edge.id);
          if (cutDragStart.current === null) toggleCutMode();
        }}
        defaultEdgeOptions={{
          animated: false,
          type: 'default',
          style: {
            stroke: 'var(--edge-color)',
            strokeWidth: 1.5,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          },
        }}
        proOptions={{ hideAttribution: true }}
        fitView
        className="bg-[var(--background)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--dot-color)" />
        <Controls 
          className="nextflow-controls !bg-[#1a1a1a]/95 backdrop-blur-md !border !border-white/10 !text-[#8e8e8e] !rounded-xl overflow-hidden shadow-2xl [&>button]:!border-white/5 [&>button]:hover:!bg-white/10 [&>button]:hover:!text-white [&>button]:transition-colors" 
          position="bottom-right" 
          showInteractive={false} 
        />
        <MiniMap
          className="bg-[#111] border border-[#222] rounded-lg overflow-hidden !bottom-16"
          nodeColor="#333"
          maskColor="rgba(0, 0, 0, 0.55)"
        />
      </ReactFlow>

      {contextMenu && (
        <div
          className="fixed z-[100] w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-2xl dark:border-[#2a2a2a] dark:bg-[#161616]"
          style={{ top: contextMenu.top, left: contextMenu.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col text-[13px] font-medium text-neutral-700 dark:text-neutral-300">
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/5" onClick={() => {
              window.dispatchEvent(new CustomEvent('nextflow:open-editor', { detail: { id: contextMenu.id } }));
              setContextMenu(null);
            }}>
              <span className="flex items-center gap-2"><Pencil size={15} /> Open Text Editor</span>
            </button>
            <div className="my-[2px] h-[1px] bg-neutral-100 dark:bg-white/5" />
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/5" onClick={() => {
              copySelectedNodes();
              setContextMenu(null);
            }}>
              <span className="flex items-center gap-2"><Copy size={15} /> Copy</span>
              <div className="flex items-center gap-1 text-[10px] tracking-wider text-neutral-400 dark:text-neutral-500">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 pb-[1px] dark:border-[#333] dark:bg-[#1f1f1f]">⌘</kbd>
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 pb-[1px] dark:border-[#333] dark:bg-[#1f1f1f]">C</kbd>
              </div>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/5" onClick={() => { 
                duplicateSelectedNodes();
                setContextMenu(null); 
              }}>
              <span className="flex items-center gap-2"><CopyPlus size={15} /> Duplicate</span>
              <div className="flex items-center gap-1 text-[10px] tracking-wider text-neutral-400 dark:text-neutral-500">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 pb-[1px] dark:border-[#333] dark:bg-[#1f1f1f]">⌘</kbd>
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 pb-[1px] dark:border-[#333] dark:bg-[#1f1f1f]">D</kbd>
              </div>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/5" onClick={() => {
              const newTitle = window.prompt('Enter new node name:');
              if (newTitle) updateNodeData(contextMenu.id, { title: newTitle });
              setContextMenu(null);
            }}>
              <span className="flex items-center gap-2"><Edit2 size={15} /> Rename</span>
              <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 pb-[1px] text-[10px] text-neutral-400 dark:border-[#333] dark:bg-[#1f1f1f] dark:text-neutral-500">R</kbd>
            </button>
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/5" onClick={() => {
              disableSelectedNodes();
              setContextMenu(null);
            }}>
              <span className="flex items-center gap-2"><EyeOff size={15} /> Disable Node</span>
            </button>
            <div className="my-[2px] h-[1px] bg-neutral-100 dark:bg-white/5" />
            <button className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-red-500 hover:bg-red-50 dark:text-[#ff4a4a] dark:hover:bg-red-500/10" onClick={() => { 
                deleteSelectedNodes();
                setContextMenu(null); 
              }}>
              <span className="flex items-center gap-2"><Trash size={15} /> Delete</span>
              <kbd className="rounded border border-red-200 bg-red-50 px-1 pb-[1px] text-[10px] text-red-400 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-500/50">⌫</kbd>
            </button>
          </div>
        </div>
      )}
      {/* Global Markdown Editor Overlay outside of ReactFlow Transform Viewport */}
      {editingTextNodeId && activeTextNode && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-[#0A0A0A] m-0 p-0"
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex h-16 w-full items-center justify-between px-6 border-b border-white/5 bg-[#0A0A0A]">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center text-[15px]">
                <span className="text-white font-semibold">Text</span>
                <span className="mx-2 text-white/50 text-xs font-mono">{'>'}</span>
                <span className="text-white font-semibold">Input Text</span>
              </div>
              <span className="text-xs text-white/40 font-medium">Edit your content using Markdown formatting, saves automatically</span>
            </div>
            
            <button
              className="flex items-center gap-3 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-black hover:bg-neutral-200 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setEditingTextNodeId(null);
              }}
            >
              Done
              <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium font-sans">
                <span>Ctrl+</span>
                <span className="font-serif">↵</span>
                <span>/ Esc</span>
              </div>
            </button>
          </div>

          {/* Editor Core */}
          <div className="flex flex-1 items-center justify-center bg-[#0A0A0A] overflow-hidden p-8">
            <textarea
              className="max-w-4xl h-full w-full resize-none bg-transparent p-0 text-base text-white/90 font-light placeholder:text-white/20 focus:outline-none nodrag nowheel pt-8"
              value={(activeTextNode.data?.value as string) || ''}
              onChange={(e) => updateNodeData(editingTextNodeId, { value: e.target.value })}
              placeholder="Please enter..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape' || (e.ctrlKey && e.key === 'Enter')) {
                  setEditingTextNodeId(null);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowCanvasWithProvider() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasBody />
    </ReactFlowProvider>
  );
}

export function WorkflowCanvasWithProviderHydrated({
  workflowId,
  initialNodes,
  initialEdges,
}: {
  workflowId: string;
  initialNodes: Node[];
  initialEdges: Edge[];
}) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasBody workflowId={workflowId} initialNodes={initialNodes} initialEdges={initialEdges} />
    </ReactFlowProvider>
  );
}
