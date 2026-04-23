'use client';

import React, { useMemo } from 'react';

interface WorkflowPreviewProps {
  nodes: any[];
  edges: any[];
}

export function WorkflowPreview({ nodes = [], edges = [] }: WorkflowPreviewProps) {
  const previewContent = useMemo(() => {
    // Parse nodes/edges if they are strings
    const parsedNodes = typeof nodes === 'string' ? JSON.parse(nodes) : nodes;
    const parsedEdges = typeof edges === 'string' ? JSON.parse(edges) : edges;

    if (!Array.isArray(parsedNodes) || parsedNodes.length === 0) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-[#181818]/30">
          <div className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/5" />
        </div>
      );
    }

    // Calculate bounding box with node sizes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    parsedNodes.forEach((node: any) => {
      const x = node.position?.x ?? 0;
      const y = node.position?.y ?? 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 150);
      maxY = Math.max(maxY, y + 80);
    });

    const padding = 100;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    // Ensure we have some minimum dimensions to avoid division by zero or tiny previews
    const viewBoxWidth = Math.max(contentWidth + padding * 2, 600);
    const viewBoxHeight = Math.max(contentHeight + padding * 2, 450);
    
    // Center the content in the viewBox
    const offsetX = minX - (viewBoxWidth - contentWidth) / 2;
    const offsetY = minY - (viewBoxHeight - contentHeight) / 2;

    return (
      <svg
        viewBox={`${offsetX} ${offsetY} ${viewBoxWidth} ${viewBoxHeight}`}
        className="h-full w-full bg-[#0a0a0a]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render Edges */}
        {Array.isArray(parsedEdges) && parsedEdges.map((edge: any, idx: number) => {
          const sourceNode = parsedNodes.find((n: any) => n.id === edge.source);
          const targetNode = parsedNodes.find((n: any) => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const x1 = (sourceNode.position?.x ?? 0) + 150;
          const y1 = (sourceNode.position?.y ?? 0) + 40;
          const x2 = (targetNode.position?.x ?? 0);
          const y2 = (targetNode.position?.y ?? 0) + 40;

          const cx1 = x1 + Math.abs(x2 - x1) * 0.5;
          const cx2 = x2 - Math.abs(x2 - x1) * 0.5;

          const edgeColor = sourceNode.type === 'llm' ? '#FFC700' : 
                            sourceNode.type === 'image' || sourceNode.type === 'video' || sourceNode.type === 'crop' || sourceNode.type === 'extract' ? '#4b9cff' : 
                            '#ffffff';

          return (
            <path
              key={edge.id || idx}
              d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={edgeColor}
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.3"
            />
          );
        })}

        {/* Render Nodes */}
        {parsedNodes.map((node: any, idx: number) => {
          const x = node.position?.x ?? 0;
          const y = node.position?.y ?? 0;
          
          const color = node.type === 'llm' ? 'fill-[#FFC700]' : 
                        node.type === 'image' || node.type === 'video' || node.type === 'crop' || node.type === 'extract' ? 'fill-[#4b9cff]' : 
                        'fill-white';

          return (
            <rect
              key={node.id || idx}
              x={x}
              y={y}
              width="150"
              height="80"
              rx="16"
              className={`${color} opacity-[0.15]`}
            />
          );
        })}
      </svg>
    );
  }, [nodes, edges]);

  return (
    <div className="h-full w-full overflow-hidden">
      {previewContent}
    </div>
  );
}
