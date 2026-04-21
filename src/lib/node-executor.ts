import type { Node } from '@xyflow/react';
import type { NodeIOMap } from '@/lib/workflow-engine';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeAsArray(input: unknown): string[] {
  if (!input) return [];
  return Array.isArray(input) ? input.filter(Boolean).map(String) : [String(input)];
}

export async function executeNode(node: Node, inputs: NodeIOMap): Promise<NodeIOMap> {
  const data = node.data ?? {};

  if (node.type === 'text') {
    return { output: String(data.value ?? '') };
  }

  if (node.type === 'image') {
    if (!data.imageUrl) throw new Error('Image node has no uploaded image.');
    return { image_url: String(data.imageUrl) };
  }

  if (node.type === 'video') {
    if (!data.videoUrl) throw new Error('Video node has no uploaded video.');
    return { video_url: String(data.videoUrl) };
  }

  if (node.type === 'crop') {
    const imageUrl = String(inputs.image_url ?? data.imageUrl ?? '');
    if (!imageUrl) throw new Error('Crop node is missing image_url input.');
    await delay(850);
    return {
      output: `${imageUrl}?cropped=true&x=${data.x_percent ?? 0}&y=${data.y_percent ?? 0}&w=${data.width_percent ?? 100}&h=${data.height_percent ?? 100}`,
    };
  }

  if (node.type === 'extract') {
    const videoUrl = String(inputs.video_url ?? data.videoUrl ?? '');
    if (!videoUrl) throw new Error('Extract node is missing video_url input.');
    const timestamp = String(data.timestamp ?? '5s');
    await delay(950);
    return { output: `${videoUrl}?frame=${encodeURIComponent(timestamp)}` };
  }

  if (node.type === 'llm') {
    const userMessage = String(inputs.user_message ?? data.value ?? '');
    if (!userMessage) throw new Error('LLM node requires a user message.');

    const systemPrompt = String(inputs.system_prompt ?? '');
    const images = normalizeAsArray(inputs.images);
    await delay(1100);

    const mockResponse = [
      '**Simulated Gemini Output**',
      '',
      systemPrompt ? `System: ${systemPrompt}` : 'System: (none)',
      `Prompt: ${userMessage}`,
      `Images: ${images.length}`,
    ].join('\n');

    return { output: mockResponse };
  }

  await delay(400);
  return { output: data.output ?? null };
}
