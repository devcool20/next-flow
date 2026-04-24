import { logger, task } from "@trigger.dev/sdk/v3";
import { extractFrameFromVideoToDataUrl } from "@/lib/media-processing";

function validateTimestamp(raw: string): string {
  const value = raw.trim();
  if (!value) return "0";

  const isPercent = /^\d+(?:\.\d+)?%$/.test(value);
  const isSeconds = /^\d+(?:\.\d+)?(?:s)?$/i.test(value);

  if (!isPercent && !isSeconds) {
    throw new Error("timestamp must be seconds (e.g. 5 or 5s) or percentage (e.g. 50%).");
  }

  return value;
}

export const extractFrameTask = task({
  id: "extract-frame",
  queue: {
    name: "nextflow-media",
    concurrencyLimit: 10,
  },
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 5000,
    randomize: true,
  },
  maxDuration: 180,
  run: async (payload: { videoUrl: string; timestamp: string }) => {
    logger.info("Starting frame extraction task", { payload });

    const videoUrl = String(payload.videoUrl ?? "").trim();
    if (!videoUrl) {
      throw new Error("videoUrl is required.");
    }

    const timestamp = validateTimestamp(String(payload.timestamp ?? "0"));

    logger.info("Executing frame extraction", { timestamp });
    const frameUrl = await extractFrameFromVideoToDataUrl({ videoUrl, timestamp });

    logger.info("Frame extraction complete");

    return {
      message: "Extracted successfully",
      frameUrl,
    };
  },
});
