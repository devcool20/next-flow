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
  name: 'Product Marketing Kit Generator',
  description: 'Strict implementation of the 6-node marketing suite workflow with parallel branching and convergence.',
  nodes: [
    // Branch A: Image Processing
    {
      id: 'node_image',
      type: 'image',
      position: { x: 50, y: 50 },
      data: {
        label: 'Upload Product Photo',
        imageUrl:
          'https://images.pexels.com/photos/3394651/pexels-photo-3394651.jpeg?auto=compress&cs=tinysrgb&w=1200',
      },
    },
    {
      id: 'node_crop',
      type: 'crop',
      position: { x: 350, y: 50 },
      data: { label: 'Focus Crop', x_percent: '10', y_percent: '10', width_percent: '80', height_percent: '80' },
    },
    
    // Branch A: Text Inputs
    {
      id: 'node_text_system',
      type: 'text',
      position: { x: 50, y: 300 },
      data: { 
        label: 'System Persona', 
        value: 'You are a professional marketing copywriter. Generate a compelling one-paragraph product description.' 
      },
    },
    {
      id: 'node_text_details',
      type: 'text',
      position: { x: 350, y: 300 },
      data: { 
        label: 'Product Specs', 
        value: 'Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.' 
      },
    },

    // Branch A Output: LLM 1
    {
      id: 'node_llm_1',
      type: 'llm',
      position: { x: 700, y: 150 },
      data: { 
        label: 'Draft Description', 
        model: 'gemini-2.5-flash'
      },
    },

    // Branch B: Video Processing
    {
      id: 'node_video',
      type: 'video',
      position: { x: 50, y: 550 },
      data: { 
        label: 'Product Demo Video', 
        videoUrl: 'https://samplelib.com/mp4/sample-5s-720p.mp4' 
      },
    },
    {
      id: 'node_extract',
      type: 'extract',
      position: { x: 350, y: 550 },
      data: { label: 'Extract Hero Frame', timestamp: '50%' },
    },

    // Convergence: LLM 2
    {
      id: 'node_text_final_instr',
      type: 'text',
      position: { x: 700, y: 500 },
      data: { 
        label: 'Final Instructions', 
        value: 'You are a social media manager. Create a tweet-length marketing post based on the product image and video frame.' 
      },
    },
    {
      id: 'node_llm_2',
      type: 'llm',
      position: { x: 1100, y: 300 },
      data: { 
        label: 'Final Marketing Summary', 
        model: 'gemini-2.5-flash'
      },
    },
  ],
  edges: [
    // Branch A connections
    { id: 'e_img_to_crop', source: 'node_image', sourceHandle: 'image_url', target: 'node_crop', targetHandle: 'image_url', animated: true },
    { id: 'e_sys_to_llm1', source: 'node_text_system', sourceHandle: 'output', target: 'node_llm_1', targetHandle: 'system_prompt', animated: true },
    { id: 'e_det_to_llm1', source: 'node_text_details', sourceHandle: 'output', target: 'node_llm_1', targetHandle: 'user_message', animated: true },
    { id: 'e_crop_to_llm1', source: 'node_crop', sourceHandle: 'output', target: 'node_llm_1', targetHandle: 'images', animated: true },

    // Branch B connections
    { id: 'e_vid_to_ext', source: 'node_video', sourceHandle: 'video_url', target: 'node_extract', targetHandle: 'video_url', animated: true },

    // Convergence connections (Strict according to requirements)
    { id: 'e_instr_to_llm2', source: 'node_text_final_instr', sourceHandle: 'output', target: 'node_llm_2', targetHandle: 'system_prompt', animated: true },
    { id: 'e_llm1_to_llm2', source: 'node_llm_1', sourceHandle: 'output', target: 'node_llm_2', targetHandle: 'user_message', animated: true },
    { id: 'e_crop_to_llm2', source: 'node_crop', sourceHandle: 'output', target: 'node_llm_2', targetHandle: 'images', animated: true },
    { id: 'e_ext_to_llm2', source: 'node_extract', sourceHandle: 'output', target: 'node_llm_2', targetHandle: 'images', animated: true },
  ],
};

export const workflowSamples: WorkflowSample[] = [productMarketingKitSample];
