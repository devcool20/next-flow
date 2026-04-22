import { logger, task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

export const runLLMTask = task({
  id: "run-llm",
  run: async (payload: { 
    model: string; 
    systemPrompt?: string; 
    userMessage: string;
    images?: string[]; 
  }) => {
    logger.info("Starting LLM Generation", { model: payload.model });

    // Initialize Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        // If no credentials, we mock the result to ensure the prototype runs without crashing
        logger.warn("No GEMINI_API_KEY found, simulating response.");
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return {
            response: `**Mocked Response**\n\nThis is a simulated response because the \`GEMINI_API_KEY\` was not provided in the environment.\n\n* Received User Message: "${payload.userMessage}"\n* Received ${payload.images?.length || 0} images.`
        };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      // Construct the model, applying system instructions if provided
      let modelIdentifier = payload.model.includes('-pro') ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
      
      // Explicitly map legacy names if they come in literally
      if (payload.model === 'gemini-1.5-flash') modelIdentifier = 'gemini-2.5-flash';
      if (payload.model === 'gemini-1.5-pro') modelIdentifier = 'gemini-2.5-pro';
      
      const model = genAI.getGenerativeModel({ 
          model: modelIdentifier,
          ...(payload.systemPrompt && { systemInstruction: payload.systemPrompt }) 
      });

      // Prepare multimodal content parts
      const promptParts: (string | Part)[] = [payload.userMessage];

      // If there are images, we need to fetch them and parse them to base64 for Gemini
      if (payload.images && payload.images.length > 0) {
        for (const imageUrl of payload.images) {
            try {
                // In production, we'd validate these URLs
                const imageResp = await fetch(imageUrl);
                const arrayBuffer = await imageResp.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                
                // Infer mime type or default to jpeg
                const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';
                
                promptParts.push({
                    inlineData: {
                        data: buffer.toString("base64"),
                        mimeType
                    }
                });
            } catch (err) {
                logger.error(`Failed to fetch and parse image: ${imageUrl}`, { error: err });
                // We decide to continue even if one image fails
            }
        }
      }

      logger.info("Calling Gemini API...");
      const result = await model.generateContent(promptParts);
      const responseText = result.response.text();

      logger.info("LLM Generation complete");

      return {
        response: responseText
      };

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown LLM task error";
        logger.error("LLM Task Failed", { error: message });
        throw e;
    }
  },
});
