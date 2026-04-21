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
  } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
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
        <Controls className="nextflow-controls fill-white" position="bottom-left" />
        <MiniMap
          className="bg-[#111] border-2 border-[#222] rounded-lg overflow-hidden"
          nodeColor="#333"
          maskColor="rgba(0, 0, 0, 0.55)"
        />
      </ReactFlow>
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
