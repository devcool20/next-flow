import type { Edge, Node } from '@xyflow/react';

export type NodeIOMap = Record<string, unknown>;

export type NodeRunRecord = {
  executionId: string;
  nodeId: string;
  type: string;
  title: string;
  status: 'success' | 'error' | 'running' | 'queued';
  startedAt: string;
  finishedAt: string;
  inputs: NodeIOMap;
  outputs: NodeIOMap;
  error?: string;
  errorCode?: string;
  triggerRunId?: string;
};

type IncludedGraph = {
  nodes: Node[];
  edges: Edge[];
};

export type ExecuteWorkflowOptions = {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
  persistedOutputsByNodeId?: Record<string, NodeIOMap>;
  executeNode: (node: Node, inputs: NodeIOMap) => Promise<NodeIOMap>;
  onNodeStart?: (nodeId: string, inputs: NodeIOMap) => void | Promise<void>;
  onNodeFinish?: (record: NodeRunRecord) => void | Promise<void>;
};

export type ExecuteWorkflowResult = {
  nodeRuns: NodeRunRecord[];
  executionPath: string[];
};

function isNodeDisabled(node: Node): boolean {
  return Boolean(node.data?.disabled);
}

function buildIncludedGraph(nodes: Node[], edges: Edge[], selectedNodeIds?: string[]): IncludedGraph {
  const enabledNodes = nodes.filter((node) => !isNodeDisabled(node));
  const enabledNodeIds = new Set(enabledNodes.map((node) => node.id));
  const enabledEdges = edges.filter((edge) => enabledNodeIds.has(edge.source) && enabledNodeIds.has(edge.target));

  if (!selectedNodeIds?.length) {
    if (enabledEdges.length === 0) {
      return { nodes: enabledNodes, edges: enabledEdges };
    }

    const connectedNodeIds = new Set<string>();
    for (const edge of enabledEdges) {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    return {
      nodes: enabledNodes.filter((node) => connectedNodeIds.has(node.id)),
      edges: enabledEdges,
    };
  }

  const selected = new Set(selectedNodeIds.filter((nodeId) => enabledNodeIds.has(nodeId)));
  return {
    nodes: enabledNodes.filter((node) => selected.has(node.id)),
    edges: enabledEdges.filter((edge) => selected.has(edge.target)),
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

function buildExecutionGraph(nodes: Node[], edges: Edge[]) {
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

  return { indegree, outgoing };
}

function buildInputsForNode(
  nodeId: string,
  edges: Edge[],
  nodeOutputs: Map<string, NodeIOMap>,
  persistedOutputsByNodeId: Record<string, NodeIOMap>
): NodeIOMap {
  const incomingEdges = edges
    .map((edge, index) => ({ edge, index }))
    .filter(({ edge }) => edge.target === nodeId)
    .sort((a, b) => a.index - b.index)
    .map(({ edge }) => edge);

  const inputs: NodeIOMap = {};

  for (const edge of incomingEdges) {
    const sourceOutputs = nodeOutputs.get(edge.source) ?? persistedOutputsByNodeId[edge.source] ?? {};
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
  const persistedOutputsByNodeId = options.persistedOutputsByNodeId ?? {};

  if (nodes.length === 0) {
    throw new Error('No nodes available to execute.');
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeOutputs = new Map<string, NodeIOMap>();
  const nodeRuns: NodeRunRecord[] = [];
  const executionPath: string[] = [];
  getExecutionLevels(nodes, edges);

  const { indegree, outgoing } = buildExecutionGraph(nodes, edges);
  const remainingParents = new Map(indegree);
  const roots = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([nodeId]) => nodeId);
  let runningCount = 0;
  let scheduledCount = 0;
  let firstError: string | null = null;

  await new Promise<void>((resolve, reject) => {
    const maybeComplete = () => {
      if (runningCount === 0) {
        resolve();
      }
    };

    const scheduleNode = (nodeId: string) => {
      const nodeIndex = scheduledCount;
      scheduledCount += 1;
      runningCount += 1;

      void (async () => {
        const node = nodeMap.get(nodeId);
        if (!node) {
          return;
        }

        const inputs = buildInputsForNode(nodeId, edges, nodeOutputs, persistedOutputsByNodeId);
        const startedAt = new Date().toISOString();
        const executionId = `${nodeId}:${startedAt}:${nodeIndex}`;

        await onNodeStart?.(nodeId, inputs);

        let outputs: NodeIOMap | null = null;
        let record: NodeRunRecord;

        try {
          outputs = await executeNode(node, inputs);
          const finishedAt = new Date().toISOString();

          record = {
            executionId,
            nodeId,
            type: node.type ?? 'unknown',
            title: String(node.data?.label ?? node.type ?? 'Node'),
            status: 'success',
            startedAt,
            finishedAt,
            inputs,
            outputs,
          };
        } catch (error) {
          const finishedAt = new Date().toISOString();
          const message = error instanceof Error ? error.message : 'Unknown node execution error.';

          record = {
            executionId,
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
        }

        nodeRuns.push(record);
        if (record.status === 'success' && outputs) {
          nodeOutputs.set(nodeId, outputs);
          executionPath.push(nodeId);
        }

        await onNodeFinish?.(record);

        if (record.status === 'success') {
          if (!firstError) {
            for (const targetId of outgoing.get(nodeId) ?? []) {
              const nextRemaining = (remainingParents.get(targetId) ?? 0) - 1;
              remainingParents.set(targetId, nextRemaining);
              if (nextRemaining === 0) {
                scheduleNode(targetId);
              }
            }
          }
        } else {
          if (!firstError) {
            firstError = record.error ?? `Node ${nodeId} failed`;
          }
        }
      })()
        .catch(reject)
        .finally(() => {
          runningCount -= 1;
          maybeComplete();
        });
    };

    for (const rootId of roots) {
      scheduleNode(rootId);
    }

    maybeComplete();
  });

  if (firstError) {
    throw new Error(firstError);
  }

  return { nodeRuns, executionPath };
}
