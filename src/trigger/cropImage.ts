import { logger, task } from "@trigger.dev/sdk/v3";
import { cropImageToDataUrl } from "@/lib/media-processing";

function parseAndValidatePercent(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100.`);
  }
  return value;
}

export const cropImageTask = task({
  id: "crop-image",
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
  run: async (payload: { imageUrl: string; x: number; y: number; w: number; h: number }) => {
    logger.info("Starting image crop task", { payload });

    const imageUrl = String(payload.imageUrl ?? "").trim();
    if (!imageUrl) {
      throw new Error("imageUrl is required.");
    }

    const x = parseAndValidatePercent(payload.x, "x");
    const y = parseAndValidatePercent(payload.y, "y");
    const w = parseAndValidatePercent(payload.w, "w");
    const h = parseAndValidatePercent(payload.h, "h");

    if (w <= 0 || h <= 0) {
      throw new Error("w and h must be greater than 0.");
    }

    logger.info("Executing crop operation");
    const croppedUrl = await cropImageToDataUrl({ imageUrl, x, y, w, h });

    logger.info("Image crop complete");

    return {
      message: "Cropped successfully",
      croppedUrl,
    };
  },
});
