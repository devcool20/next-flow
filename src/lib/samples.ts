import type { Edge, Node } from '@xyflow/react';

export type WorkflowSample = {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
};

const productMarketingKitSample: WorkflowSample = {
  id: 'product-marketing-kit',
  name: 'Product Marketing Kit',
  description: 'Generates marketing copy from uploaded product image and demo video frame.',
  nodes: [
    {
      id: 'sample_text_system',
      type: 'text',
      position: { x: 80, y: 80 },
      data: {
        label: 'System Prompt',
        value: 'You are a senior product marketer. Write concise ad copy and three social captions.',
      },
    },
    {
      id: 'sample_text_user',
      type: 'text',
      position: { x: 80, y: 270 },
      data: {
        label: 'User Message',
        value: 'Create a launch package for our new AI photo enhancer.',
      },
    },
    {
      id: 'sample_image',
      type: 'image',
      position: { x: 420, y: 80 },
      data: { label: 'Product Image', imageUrl: 'https://picsum.photos/seed/product/800/800' },
    },
    {
      id: 'sample_video',
      type: 'video',
      position: { x: 420, y: 300 },
      data: { label: 'Demo Video', videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' },
    },
    {
      id: 'sample_crop',
      type: 'crop',
      position: { x: 760, y: 80 },
      data: { label: 'Hero Crop', x_percent: '5', y_percent: '5', width_percent: '90', height_percent: '90' },
    },
    {
      id: 'sample_extract',
      type: 'extract',
      position: { x: 760, y: 300 },
      data: { label: 'Best Frame', timestamp: '3s' },
    },
    {
      id: 'sample_llm',
      type: 'llm',
      position: { x: 1120, y: 180 },
      data: { label: 'Marketing Brain', model: 'gemini-1.5-flash' },
    },
  ],
  edges: [
    { id: 'e1', source: 'sample_text_system', sourceHandle: 'output', target: 'sample_llm', targetHandle: 'system_prompt', type: 'smoothstep', animated: true },
    { id: 'e2', source: 'sample_text_user', sourceHandle: 'output', target: 'sample_llm', targetHandle: 'user_message', type: 'smoothstep', animated: true },
    { id: 'e3', source: 'sample_image', sourceHandle: 'image_url', target: 'sample_crop', targetHandle: 'image_url', type: 'smoothstep', animated: true },
    { id: 'e4', source: 'sample_video', sourceHandle: 'video_url', target: 'sample_extract', targetHandle: 'video_url', type: 'smoothstep', animated: true },
    { id: 'e5', source: 'sample_crop', sourceHandle: 'output', target: 'sample_llm', targetHandle: 'images', type: 'smoothstep', animated: true },
    { id: 'e6', source: 'sample_extract', sourceHandle: 'output', target: 'sample_llm', targetHandle: 'images', type: 'smoothstep', animated: true },
  ],
};

export const workflowSamples: WorkflowSample[] = [productMarketingKitSample];
