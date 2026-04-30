import type { Node } from '@xyflow/react';
import type { NodeIOMap } from '@/lib/workflow-engine';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cropImageToDataUrl, extractFrameFromVideoToDataUrl } from '@/lib/media-processing';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function parsePercent(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function validatePercent(value: number, name: string, min = 0): number {
  if (!Number.isFinite(value) || value < min || value > 100) {
    throw new Error(`${name} must be between ${min} and 100.`);
  }
  return value;
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
    const output = await cropImageToDataUrl({
      imageUrl,
      x: validatePercent(parsePercent(inputs.x_percent ?? data.x_percent, 0), 'x_percent'),
      y: validatePercent(parsePercent(inputs.y_percent ?? data.y_percent, 0), 'y_percent'),
      w: validatePercent(parsePercent(inputs.width_percent ?? data.width_percent, 100), 'width_percent', 1),
      h: validatePercent(parsePercent(inputs.height_percent ?? data.height_percent, 100), 'height_percent', 1),
    });
    return { output };
  }

  if (node.type === 'extract') {
    const videoUrl = String(inputs.video_url ?? data.videoUrl ?? '');
    if (!videoUrl) throw new Error('Extract node is missing video_url input.');
    const timestamp = String(inputs.timestamp ?? data.timestamp ?? '0');
    const output = await extractFrameFromVideoToDataUrl({ videoUrl, timestamp });
    return { output };
  }

  if (node.type === 'llm') {
    const rawUserMessage = inputs.user_message ?? data.userMessage ?? '';
    const userMessage = Array.isArray(rawUserMessage) ? rawUserMessage.join('\n\n') : String(rawUserMessage);
    
    if (!userMessage) throw new Error('LLM node requires a user message.');

    const rawSystemPrompt = inputs.system_prompt ?? data.systemPrompt ?? '';
    const systemPrompt = Array.isArray(rawSystemPrompt) ? rawSystemPrompt.join('\n\n') : String(rawSystemPrompt);
    
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
      ].join('\n');
      return { output: mockResponse };
    }

      try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const requestedModel = String(data.model ?? 'gemini-2.5-flash').toLowerCase();
      const modelIdentifier = requestedModel.includes('pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

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
            if (!mimeType.startsWith('image/')) {
              console.warn(`Skipping non-image URL for LLM image input: ${imageUrl} (${mimeType})`);
              continue;
            }
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
