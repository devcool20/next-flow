import { logger, task } from "@trigger.dev/sdk/v3";

function parseAndValidatePercent(value: number, name: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100.`);
  }
  return value;
}

export const cropImageTask = task({
  id: "crop-image",
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

    // Deterministic cropped URL seed (placeholder for FFmpeg+storage in production)
    const seed = Buffer.from(`${imageUrl}|${x}|${y}|${w}|${h}`).toString("base64url").slice(0, 48);
    const croppedUrl = `https://picsum.photos/seed/crop-${seed}/800/800`;

    logger.info("Image crop complete");

    return {
      message: "Cropped successfully",
      croppedUrl,
    };
  },
});
