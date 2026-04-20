'use client';
import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow
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
}; // We will add custom nodes here in Phase 3

let id = 0;
const getId = () => `dndnode_${id++}`;

function WorkflowCanvasBody() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode } = useWorkflowStore();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

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

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  return (
    <div className="w-full h-full" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        className="bg-[#0A0A0A]"
      >
        <Background gap={24} size={1} color="#333" />
        <Controls className="fill-white bg-[#111] border-[#333]" />
        <MiniMap 
          className="bg-[#111] border-2 border-[#222] rounded-lg overflow-hidden" 
          nodeColor="#444" 
          maskColor="rgba(0, 0, 0, 0.5)"
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
