import type { Edge, Node } from '@xyflow/react';

export type IncludedGraph = {
  nodes: Node[];
  edges: Edge[];
};

export function isNodeDisabled(node: Node): boolean {
  return Boolean(node.data?.disabled);
}

export function getIncludedGraph(nodes: Node[], edges: Edge[], selectedNodeIds?: string[]): IncludedGraph {
  const enabledNodes = nodes.filter((node) => !isNodeDisabled(node));
  const enabledNodeIds = new Set(enabledNodes.map((node) => node.id));
  const enabledEdges = edges.filter((edge) => enabledNodeIds.has(edge.source) && enabledNodeIds.has(edge.target));

  if (selectedNodeIds?.length) {
    const selected = new Set(selectedNodeIds.filter((nodeId) => enabledNodeIds.has(nodeId)));
    return {
      nodes: enabledNodes.filter((node) => selected.has(node.id)),
      edges: enabledEdges.filter((edge) => selected.has(edge.source) && selected.has(edge.target)),
    };
  }

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
