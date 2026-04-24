import type { Edge, Node } from '@xyflow/react';

export type RunScope = 'full' | 'partial' | 'single';

export type RunBody = {
  workflowId: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  scope: RunScope;
};

export type WorkflowOrchestratorPayload = {
  runId: string;
  workflowId: string;
  scope: RunScope;
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  queuedAt: string;
};
