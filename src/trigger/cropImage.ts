import { logger, task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const cropImageTask = task({
  id: "crop-image",
  maxRetries: 3,
  run: async (payload: { imageUrl: string; x: number; y: number; w: number; h: number }) => {
    logger.info("Starting image crop task", { payload });

    // In a real environment, we would:
    // 1. Download the image from payload.imageUrl to /tmp
    // 2. Run FFmpeg to crop
    // 3. Upload to Transloadit / S3
    
    // Simulating the FFmpeg execution delay
    logger.info("Executing FFmpeg...");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    /* 
    // Actual implementation would look like:
    try {
      const { stdout, stderr } = await execAsync(
        `ffmpeg -i /tmp/input.jpg -filter:v "crop=in_w*${payload.w/100}:in_h*${payload.h/100}:in_w*${payload.x/100}:in_h*${payload.y/100}" /tmp/output.jpg`
      );
      logger.info("FFmpeg completed", { stdout, stderr });
    } catch (e) {
      logger.error("FFmpeg failed", { error: e });
      throw e;
    }
    */

    logger.info("Image crop complete");
    
    return {
      message: "Cropped successfully",
      // Simulating returning a modified URL by appending a query param
      croppedUrl: `${payload.imageUrl}?cropped=true&x=${payload.x}&y=${payload.y}&w=${payload.w}&h=${payload.h}`
    };
  },
});
