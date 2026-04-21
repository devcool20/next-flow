import type { Edge, Node } from '@xyflow/react';

export type NodeIOMap = Record<string, unknown>;

export type NodeRunRecord = {
  nodeId: string;
  type: string;
  title: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  finishedAt: string;
  inputs: NodeIOMap;
  outputs: NodeIOMap;
  error?: string;
};

type IncludedGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type ExecuteWorkflowOptions = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  executeNode: (node: Node, inputs: NodeIOMap) => Promise<NodeIOMap>;
  onNodeStart?: (nodeId: string, inputs: NodeIOMap) => void | Promise<void>;
  onNodeFinish?: (record: NodeRunRecord) => void | Promise<void>;
};

export type ExecuteWorkflowResult = {
  nodeRuns: NodeRunRecord[];
  executionPath: string[];
};

function buildIncludedGraph(nodes: Node[], edges: Edge[], selectedNodeIds?: string[]): IncludedGraph {
  if (!selectedNodeIds?.length) {
    return { nodes, edges };
  }

  const selected = new Set(selectedNodeIds);
  return {
    nodes: nodes.filter((node) => selected.has(node.id)),
    edges: edges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)),
  };
}

function getExecutionLevels(nodes: Node[], edges: Edge[]): string[][] {
  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (!indegree.has(edge.source) || !indegree.has(edge.target)) {
      continue;
    }
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  }

  let frontier = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([nodeId]) => nodeId);
  const levels: string[][] = [];
  let processedCount = 0;

  while (frontier.length > 0) {
    levels.push(frontier);
    const nextFrontier: string[] = [];

    for (const nodeId of frontier) {
      processedCount += 1;
      for (const targetId of outgoing.get(nodeId) ?? []) {
        const nextDegree = (indegree.get(targetId) ?? 0) - 1;
        indegree.set(targetId, nextDegree);
        if (nextDegree === 0) {
          nextFrontier.push(targetId);
        }
      }
    }

    frontier = nextFrontier;
  }

  if (processedCount !== nodes.length) {
    throw new Error('Circular dependency detected in workflow graph.');
  }

  return levels;
}

function buildInputsForNode(nodeId: string, edges: Edge[], nodeOutputs: Map<string, NodeIOMap>): NodeIOMap {
  const incomingEdges = edges.filter((edge) => edge.target === nodeId);
  const inputs: NodeIOMap = {};

  for (const edge of incomingEdges) {
    const sourceOutputs = nodeOutputs.get(edge.source) ?? {};
    const sourceKey = edge.sourceHandle ?? 'output';
    const targetKey = edge.targetHandle ?? 'input';
    const value = sourceOutputs[sourceKey];

    if (typeof value === 'undefined') {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(inputs, targetKey)) {
      const current = inputs[targetKey];
      inputs[targetKey] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      inputs[targetKey] = value;
    }
  }

  return inputs;
}

export async function executeWorkflow(options: ExecuteWorkflowOptions): Promise<ExecuteWorkflowResult> {
  const { executeNode, onNodeFinish, onNodeStart } = options;
  const { nodes, edges } = buildIncludedGraph(options.nodes, options.edges, options.selectedNodeIds);

  if (nodes.length === 0) {
    throw new Error('No nodes available to execute.');
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOutputs = new Map<string, NodeIOMap>();
  const nodeRuns: NodeRunRecord[] = [];
  const executionPath: string[] = [];
  const levels = getExecutionLevels(nodes, edges);

  for (const level of levels) {
    await Promise.all(
      level.map(async (nodeId) => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          return;
        }

        const inputs = buildInputsForNode(nodeId, edges, nodeOutputs);
        const startedAt = new Date().toISOString();

        await onNodeStart?.(nodeId, inputs);

        try {
          const outputs = await executeNode(node, inputs);
          const finishedAt = new Date().toISOString();
          nodeOutputs.set(nodeId, outputs);
          executionPath.push(nodeId);

          const record: NodeRunRecord = {
            nodeId,
            type: node.type ?? 'unknown',
            title: String(node.data?.label ?? node.type ?? 'Node'),
            status: 'success',
            startedAt,
            finishedAt,
            inputs,
            outputs,
          };
          nodeRuns.push(record);
          await onNodeFinish?.(record);
        } catch (error) {
          const finishedAt = new Date().toISOString();
          const message = error instanceof Error ? error.message : 'Unknown node execution error.';

          const record: NodeRunRecord = {
            nodeId,
            type: node.type ?? 'unknown',
            title: String(node.data?.label ?? node.type ?? 'Node'),
            status: 'error',
            startedAt,
            finishedAt,
            inputs,
            outputs: {},
            error: message,
          };
          nodeRuns.push(record);
          await onNodeFinish?.(record);

          throw new Error(`Node ${nodeId} failed: ${message}`);
        }
      })
    );
  }

  return { nodeRuns, executionPath };
}
