import { create } from 'zustand';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import { z } from 'zod';
import type { NodeRunRecord } from '@/lib/workflow-engine';
import { workflowSamples } from '@/lib/samples';

type WorkflowRun = {
  id: string;
  startedAt: string;
  finishedAt: string;
  status: 'success' | 'error' | 'running' | 'partial';
  scope?: 'full' | 'partial' | 'single';
  duration?: number | null;
  nodeRuns: NodeRunRecord[];
  executionPath: string[];
  selectedNodeIds?: string[];
  error?: string;
};
export type InteractionMode = 'select' | 'pan' | 'cut';

type WorkflowState = {
  nodes: Node[];
  edges: Edge[];
  graphPast: { nodes: Node[]; edges: Edge[] }[];
  graphFuture: { nodes: Node[]; edges: Edge[] }[];
  isRunning: boolean;
  cutMode: boolean;
  interactionMode: InteractionMode;
  isHydrated: boolean;
  workflowId: string | null;
  history: WorkflowRun[];
  activeRunId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  addNodeAtPosition: (type: string, position: { x: number; y: number }) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  runWorkflow: () => Promise<void>;
  runSelectedWorkflow: () => Promise<void>;
  selectHistoryRun: (runId: string) => void;
  undoGraph: () => void;
  redoGraph: () => void;
  loadSampleWorkflow: (sampleId?: string) => void;
  initializeWorkspace: (payload: { workflowId: string; nodes: Node[]; edges: Edge[]; runs?: WorkflowRun[] }) => void;
  fetchRuns: () => Promise<void>;
  persistWorkflow: () => Promise<void>;
  hasInputConnection: (nodeId: string, handleId: string) => boolean;
  deleteSelectedNodes: () => void;
  toggleCutMode: () => void;
  setInteractionMode: (mode: InteractionMode) => void;
  removeEdgeById: (edgeId: string) => void;
};

const MAX_GRAPH_HISTORY = 100;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let isPersisting = false;
let queuedPersist = false;
let lastPersistSignature = '';
const DEFAULT_EDGE_STYLE = {
  stroke: 'rgba(255, 199, 0, 0.4)',
  strokeWidth: 2.1,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function cloneSnapshot(nodes: Node[], edges: Edge[]) {
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  };
}

function nextPastStack(currentPast: { nodes: Node[]; edges: Edge[] }[], nodes: Node[], edges: Edge[]) {
  const next = [...currentPast, cloneSnapshot(nodes, edges)];
  if (next.length > MAX_GRAPH_HISTORY) {
    return next.slice(next.length - MAX_GRAPH_HISTORY);
  }
  return next;
}

function getValueKindFromHandle(handleId?: string | null): 'text' | 'image' | 'video' | 'unknown' {
  if (!handleId) return 'unknown';
  if (handleId === 'video_url') return 'video';
  if (handleId === 'image_url' || handleId === 'images') return 'image';
  if (
    handleId === 'user_message' ||
    handleId === 'system_prompt' ||
    handleId === 'timestamp' ||
    handleId === 'x_percent' ||
    handleId === 'y_percent' ||
    handleId === 'width_percent' ||
    handleId === 'height_percent' ||
    handleId === 'input'
  ) {
    return 'text';
  }
  return 'unknown';
}

function getSourceKind(nodes: Node[], sourceId?: string | null, sourceHandle?: string | null) {
  const sourceNode = nodes.find((node) => node.id === sourceId);
  if (!sourceNode) return getValueKindFromHandle(sourceHandle);
  if (sourceNode.type === 'text') return 'text';
  if (sourceNode.type === 'image' || sourceNode.type === 'crop' || sourceNode.type === 'extract') return 'image';
  if (sourceNode.type === 'video') return 'video';
  if (sourceNode.type === 'llm') return 'text';
  return getValueKindFromHandle(sourceHandle);
}

function createsCycle(nodes: Node[], edges: Edge[], candidate: Edge): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of [...edges, candidate]) {
    adjacency.get(edge.source)?.push(edge.target);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();

  const dfs = (nodeId: string): boolean => {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    stack.add(nodeId);
    for (const next of adjacency.get(nodeId) ?? []) {
      if (dfs(next)) return true;
    }
    stack.delete(nodeId);
    return false;
  };

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }
  return false;
}

const connectionSchema = z
  .object({
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
  })
  .refine((value) => value.source !== value.target, 'Cannot connect node to itself');

function buildNode(type: string, position: { x: number; y: number }): Node {
  const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const title = `${type} node`;
  if (type === 'text') {
    return { id, type, position, data: { label: title, value: '' } };
  }
  if (type === 'crop') {
    return { id, type, position, data: { label: title, x_percent: '0', y_percent: '0', width_percent: '100', height_percent: '100' } };
  }
  if (type === 'extract') {
    return { id, type, position, data: { label: title, timestamp: '0' } };
  }
  if (type === 'llm') {
    return { id, type, position, data: { label: title, model: 'gemini-1.5-flash' } };
  }
  return { id, type, position, data: { label: title } };
}

function shouldPersistNodeChanges(changes: NodeChange[]) {
  if (changes.length === 0) return false;
  return changes.some((change) => change.type !== 'select');
}

function normalizeEdgeVisual(edge: Edge): Edge {
  return {
    ...edge,
    animated: false,
    type: 'default',
    style: {
      ...DEFAULT_EDGE_STYLE,
      ...(edge.style ?? {}),
    },
  };
}

async function flushPersist() {
  const { workflowId, nodes, edges, isHydrated } = useWorkflowStore.getState();
  if (!workflowId || !isHydrated) return;

  const signature = JSON.stringify({ nodes, edges });
  if (signature === lastPersistSignature && !queuedPersist) {
    return;
  }
  if (isPersisting) {
    queuedPersist = true;
    return;
  }

  isPersisting = true;
  queuedPersist = false;
  try {
    await fetch('/api/workflow', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflowId, nodes, edges }),
    });
    lastPersistSignature = signature;
  } finally {
    isPersisting = false;
    if (queuedPersist) {
      await flushPersist();
    }
  }
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  nodes: [],
  edges: [],
  graphPast: [],
  graphFuture: [],
  isRunning: false,
  cutMode: false,
  interactionMode: 'select',
  isHydrated: false,
  workflowId: null,
  history: [],
  activeRunId: null,
  onNodesChange: (changes: NodeChange[]) => {
    const state = get();
    const nextNodes = applyNodeChanges(changes, state.nodes);
    const shouldPersist = shouldPersistNodeChanges(changes);
    set({
      nodes: nextNodes,
      ...(shouldPersist
        ? {
            graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
            graphFuture: [],
          }
        : {}),
    });
    if (shouldPersist) {
      void get().persistWorkflow();
    }
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    const state = get();
    const nextEdges = applyEdgeChanges(changes, state.edges).map(normalizeEdgeVisual);
    set({
      edges: nextEdges,
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  onConnect: (connection: Connection) => {
    const parsed = connectionSchema.safeParse(connection);
    if (!parsed.success) return;
    const state = get();
    const sourceKind = getSourceKind(state.nodes, connection.source, connection.sourceHandle);
    const targetKind = getValueKindFromHandle(connection.targetHandle);
    if (targetKind !== 'unknown' && sourceKind !== 'unknown' && sourceKind !== targetKind) {
      return;
    }
    const candidate: Edge = normalizeEdgeVisual({ ...connection, id: `edge_${Date.now()}` });
    if (createsCycle(state.nodes, state.edges, candidate)) {
      return;
    }
    const nextEdges = addEdge(
      normalizeEdgeVisual({ ...connection }),
      state.edges
    );
    set({
      edges: nextEdges,
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  setNodes: (nodes: Node[]) => {
    const state = get();
    set({
      nodes,
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  setEdges: (edges: Edge[]) => {
    const state = get();
    set({
      edges: edges.map(normalizeEdgeVisual),
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  addNode: (node: Node) => {
    const state = get();
    set({
      nodes: [...state.nodes, node],
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  addNodeAtPosition: (type: string, position: { x: number; y: number }) => {
    const state = get();
    const node = buildNode(type, position);
    set({
      nodes: [...state.nodes, node],
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => {
    const state = get();
    set({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  runWorkflow: async () => {
    const { nodes, edges, workflowId } = get();
    if (nodes.length === 0) {
      return;
    }
    if (!workflowId) return;

    const connectedNodeIds = new Set<string>();
    edges.forEach((e) => {
      connectedNodeIds.add(e.source);
      connectedNodeIds.add(e.target);
    });

    set({
      isRunning: true,
      nodes: nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: connectedNodeIds.has(node.id) || edges.length === 0 ? 'running' : 'idle',
        },
      })),
    });
    try {
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, nodes, edges, scope: 'full' }),
      });
      const payload = (await response.json()) as { run?: WorkflowRun; error?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? 'Run failed');
      }
      const run = payload.run;
      set({
        isRunning: false,
        history: [run, ...get().history],
        activeRunId: run.id,
        nodes: get().nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            highlighted: run.executionPath.includes(node.id),
            ...(run.nodeRuns.find((entry) => entry.nodeId === node.id)?.outputs.output
              ? { output: run.nodeRuns.find((entry) => entry.nodeId === node.id)?.outputs.output }
              : {}),
            status: run.nodeRuns.find((entry) => entry.nodeId === node.id)?.status ?? node.data?.status,
          },
        })),
      });
    } catch (error) {
      set({
        isRunning: false,
        history: [
          {
            id: `run_${Date.now()}`,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            status: 'error',
            nodeRuns: [],
            executionPath: [],
            error: error instanceof Error ? error.message : 'Workflow failed',
            scope: 'full',
          },
          ...get().history,
        ],
      });
    }
  },
  runSelectedWorkflow: async () => {
    const { nodes, edges, workflowId } = get();
    const selectedNodeIds = nodes.filter((node) => node.selected).map((node) => node.id);
    if (selectedNodeIds.length === 0 || !workflowId) return;

    set({
      isRunning: true,
      nodes: nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: selectedNodeIds.includes(node.id) ? 'running' : node.data?.status ?? 'idle',
          highlighted: false,
        },
      })),
    });
    try {
      const scope = selectedNodeIds.length === 1 ? 'single' : 'partial';
      const response = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId, nodes, edges, selectedNodeIds, scope }),
      });
      const payload = (await response.json()) as { run?: WorkflowRun; error?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? 'Selected run failed');
      }
      const run = payload.run;

      set({
        isRunning: false,
        history: [run, ...get().history],
        activeRunId: run.id,
        nodes: get().nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            highlighted: run.executionPath.includes(node.id),
            ...(run.nodeRuns.find((entry) => entry.nodeId === node.id)?.outputs.output
              ? { output: run.nodeRuns.find((entry) => entry.nodeId === node.id)?.outputs.output }
              : {}),
            status: run.nodeRuns.find((entry) => entry.nodeId === node.id)?.status ?? node.data?.status,
          },
        })),
      });
    } catch (error) {
      set({
        isRunning: false,
        history: [
          {
            id: `run_${Date.now()}`,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            status: 'error',
            nodeRuns: [],
            executionPath: [],
            selectedNodeIds,
            error: error instanceof Error ? error.message : 'Selected run failed',
            scope: selectedNodeIds.length === 1 ? 'single' : 'partial',
          },
          ...get().history,
        ],
      });
    }
  },
  selectHistoryRun: (runId: string) => {
    const run = get().history.find((item) => item.id === runId);
    if (!run) {
      return;
    }

    set({
      activeRunId: runId,
      nodes: get().nodes.map((node) => ({
        ...node,
        data: { ...node.data, highlighted: run.executionPath.includes(node.id) },
      })),
    });
  },
  undoGraph: () => {
    const state = get();
    if (state.graphPast.length === 0) {
      return;
    }

    const previous = state.graphPast[state.graphPast.length - 1];
    set({
      nodes: structuredClone(previous.nodes),
      edges: structuredClone(previous.edges),
      graphPast: state.graphPast.slice(0, -1),
      graphFuture: [cloneSnapshot(state.nodes, state.edges), ...state.graphFuture],
    });
  },
  redoGraph: () => {
    const state = get();
    if (state.graphFuture.length === 0) {
      return;
    }

    const [next, ...rest] = state.graphFuture;
    set({
      nodes: structuredClone(next.nodes),
      edges: structuredClone(next.edges),
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: rest,
    });
  },
  loadSampleWorkflow: (sampleId?: string) => {
    const state = get();
    const sample = workflowSamples.find((item) => item.id === sampleId) ?? workflowSamples[0];
    if (!sample) {
      return;
    }

    set({
      nodes: structuredClone(sample.nodes),
      edges: structuredClone(sample.edges).map(normalizeEdgeVisual),
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  initializeWorkspace: (payload) => {
    set({
      workflowId: payload.workflowId,
      nodes: payload.nodes,
      edges: payload.edges.map(normalizeEdgeVisual),
      history: payload.runs ?? [],
      activeRunId: payload.runs?.[0]?.id ?? null,
      graphPast: [],
      graphFuture: [],
      isHydrated: true,
    });
  },
  fetchRuns: async () => {
    const { workflowId } = get();
    if (!workflowId) return;
    const response = await fetch(`/api/runs?workflowId=${workflowId}`, { method: 'GET' });
    if (!response.ok) return;
    const payload = (await response.json()) as { runs: WorkflowRun[] };
    set({
      history: payload.runs ?? [],
      activeRunId: payload.runs?.[0]?.id ?? get().activeRunId,
    });
  },
  persistWorkflow: async () => {
    if (persistTimer) {
      clearTimeout(persistTimer);
    }
    persistTimer = setTimeout(() => {
      void flushPersist();
    }, 900);
  },
  hasInputConnection: (nodeId: string, handleId: string) => {
    return get().edges.some((edge) => edge.target === nodeId && edge.targetHandle === handleId);
  },
  deleteSelectedNodes: () => {
    const state = get();
    const selectedNodeIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    if (selectedNodeIds.size === 0) return;
    const nextNodes = state.nodes.filter((node) => !selectedNodeIds.has(node.id));
    const nextEdges = state.edges.filter(
      (edge) => !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)
    );
    set({
      nodes: nextNodes,
      edges: nextEdges,
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
  toggleCutMode: () => {
    const nextCutMode = !get().cutMode;
    set({ cutMode: nextCutMode, interactionMode: nextCutMode ? 'cut' : 'select' });
  },
  setInteractionMode: (mode: InteractionMode) => {
    set({ interactionMode: mode, cutMode: mode === 'cut' });
  },
  removeEdgeById: (edgeId: string) => {
    const state = get();
    const nextEdges = state.edges.filter((edge) => edge.id !== edgeId);
    if (nextEdges.length === state.edges.length) return;
    set({
      edges: nextEdges,
      graphPast: nextPastStack(state.graphPast, state.nodes, state.edges),
      graphFuture: [],
    });
    void get().persistWorkflow();
  },
}));
