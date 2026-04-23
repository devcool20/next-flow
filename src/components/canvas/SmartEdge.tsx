'use client';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useWorkflowStore } from '@/lib/store';

export function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  sourceHandleId,
  targetHandleId,
}: EdgeProps) {
  const nodes = useWorkflowStore((state) => state.nodes);
  
  const sourceNode = nodes.find((n) => n.id === source);
  
  // Logic to determine if this edge should be blue
  // 1. Check source node type or specific media handles
  const isSourceMedia = sourceNode?.type === 'image' || 
                        sourceNode?.type === 'video' || 
                        sourceNode?.type === 'crop' || 
                        sourceNode?.type === 'extract' ||
                        sourceHandleId === 'image_url' ||
                        sourceHandleId === 'video_url' ||
                        sourceHandleId === 'frame_url' ||
                        sourceHandleId === 'cropped_url';

  // 2. Check target handle for media inputs
  const isTargetMedia = targetHandleId === 'image' || 
                        targetHandleId === 'video' || 
                        targetHandleId === 'image_url' || 
                        targetHandleId === 'video_url';

  const isBlue = isSourceMedia || isTargetMedia;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const finalStyle = {
    ...style,
    stroke: isBlue ? 'rgba(59, 130, 246, 0.6)' : 'rgba(255, 199, 0, 0.45)',
    strokeWidth: 2.1,
  };

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={finalStyle}
    />
  );
}
