import type { Node } from '@xyflow/react';
import type { NodeIOMap } from '@/lib/workflow-engine';
import { GoogleGenerativeAI } from '@google/generative-ai';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const userMessage = String(inputs.user_message ?? data.userMessage ?? '');
    if (!userMessage) throw new Error('LLM node requires a user message.');

    const systemPrompt = String(inputs.system_prompt ?? data.systemPrompt ?? '');
    
    let images: string[] = [];
    if (Array.isArray(inputs.images)) {
      images = inputs.images.map(String);
    } else if (inputs.images) {
      images = [String(inputs.images)];
    } else {
      images = String(data.imagesInput ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      await delay(1100);
      const mockResponse = [
        '**Simulated Gemini Output**',
        '',
        systemPrompt ? `System: ${systemPrompt}` : 'System: (none)',
        `Prompt: ${userMessage}`,
        `Images: ${images.length}`,
      ].join('\\n');
      return { output: mockResponse };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      let modelIdentifier = String(data.model ?? 'gemini-2.5-flash');
      
      // Map legacy models to currently available versions in this environment
      if (modelIdentifier === 'gemini-1.5-flash') modelIdentifier = 'gemini-2.5-flash';
      if (modelIdentifier === 'gemini-1.5-pro') modelIdentifier = 'gemini-2.5-pro';
      
      const model = genAI.getGenerativeModel({
        model: modelIdentifier,
        ...(systemPrompt && { systemInstruction: systemPrompt }),
      });

      const promptParts: (string | { inlineData: { data: string; mimeType: string } })[] = [userMessage];

      if (images && images.length > 0) {
        for (const imageUrl of images) {
          try {
            if (imageUrl.startsWith('blob:')) {
              console.warn(`Skipping blob URL in server-side execution: ${imageUrl}`);
              continue;
            }
            console.log(`Fetching image from: ${imageUrl.substring(0, 50)}...`);
            const imageResp = await fetch(imageUrl);
            if (!imageResp.ok) throw new Error(`Fetch failed with status ${imageResp.status}`);
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
            promptParts.push({
              inlineData: {
                data: buffer.toString('base64'),
                mimeType,
              },
            });
          } catch (err) {
            console.error(`Failed to fetch and parse image: ${imageUrl}`, err);
          }
        }
      }

      console.log(`Calling Gemini API with ${promptParts.length} parts...`);
      const result = await model.generateContent(promptParts);
      return { output: result.response.text() };
    } catch (error) {
      console.error('Local LLM generation failed:', error);
      throw new Error(`LLM generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  await delay(400);
  return { output: data.output ?? null };
}
