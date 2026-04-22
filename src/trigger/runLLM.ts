import { logger, task } from "@trigger.dev/sdk/v3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Part } from "@google/generative-ai";

const ALLOWED_MODELS = new Set(["gemini-2.5-flash", "gemini-2.5-pro"]);

type RunLlmPayload = {
  model: string;
  systemPrompt?: string;
  userMessage: string;
  images?: string[];
  outputMode?: "default" | "single_post_tweet";
  maxChars?: number;
};

function clampSinglePost(text: string, maxChars: number): string {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (cleaned.length <= maxChars) return cleaned;

  const firstParagraph = cleaned.split(/\n\n+/)[0]?.trim() ?? "";
  if (firstParagraph && firstParagraph.length <= maxChars) return firstParagraph;

  return cleaned.slice(0, maxChars).trimEnd();
}

export const runLLMTask = task({
  id: "run-llm",
  run: async (payload: RunLlmPayload) => {
    logger.info("Starting LLM Generation", { model: payload.model });

    const requestedModel = String(payload.model ?? "").toLowerCase();
    if (!ALLOWED_MODELS.has(requestedModel)) {
      throw new Error(`Model \"${requestedModel}\" is not supported. Use Gemini 2.5 Flash or Gemini 2.5 Pro.`);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY for Trigger LLM execution.");
    }

    const userMessage = String(payload.userMessage ?? "").trim();
    if (!userMessage) {
      throw new Error("LLM userMessage is required.");
    }

    const outputMode = payload.outputMode ?? "default";
    const maxChars = typeof payload.maxChars === "number" && payload.maxChars > 0 ? payload.maxChars : 280;

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: requestedModel,
        ...(payload.systemPrompt && { systemInstruction: payload.systemPrompt }),
      });

      const promptParts: (string | Part)[] = [userMessage];

      if (payload.images && payload.images.length > 0) {
        for (const imageUrl of payload.images) {
          try {
            const imageResp = await fetch(imageUrl);
            if (!imageResp.ok) {
              throw new Error(`Image fetch failed with status ${imageResp.status}`);
            }

            const mimeType = imageResp.headers.get("content-type") || "";
            if (!mimeType.startsWith("image/")) {
              logger.warn(`Skipping non-image URL: ${imageUrl}`, { mimeType });
              continue;
            }

            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            promptParts.push({
              inlineData: {
                data: buffer.toString("base64"),
                mimeType,
              },
            });
          } catch (err) {
            logger.error(`Failed to fetch and parse image: ${imageUrl}`, { error: err });
          }
        }
      }

      logger.info("Calling Gemini API...");
      const result = await model.generateContent(promptParts);
      const responseText = result.response.text();

      logger.info("LLM Generation complete");

      return {
        response: outputMode === "single_post_tweet" ? clampSinglePost(responseText, maxChars) : responseText,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown LLM task error";
      logger.error("LLM Task Failed", { error: message });
      throw e;
    }
  },
});
