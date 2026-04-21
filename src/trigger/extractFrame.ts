import { logger, task } from "@trigger.dev/sdk/v3";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const extractFrameTask = task({
  id: "extract-frame",
  run: async (payload: { videoUrl: string; timestamp: string }) => {
    logger.info("Starting frame extraction task", { payload });

    // Simulating the FFmpeg execution delay
    logger.info("Executing FFmpeg...");
    await new Promise((resolve) => setTimeout(resolve, 2500));
    
    /* 
    // Actual implementation would look like:
    // Convert 50% or 5s to actual timestamp string if needed
    try {
      const { stdout, stderr } = await execAsync(
        `ffmpeg -i /tmp/input.mp4 -ss ${payload.timestamp} -vframes 1 /tmp/output.jpg`
      );
      logger.info("FFmpeg completed", { stdout, stderr });
    } catch (e) {
      logger.error("FFmpeg failed", { error: e });
      throw e;
    }
    */

    logger.info("Frame extraction complete");
    
    return {
      message: "Extracted successfully",
      // Simulating returning a modified URL by appending a query param
      frameUrl: `${payload.videoUrl}?frame=${encodeURIComponent(payload.timestamp)}`
    };
  },
});
