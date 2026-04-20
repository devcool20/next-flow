# Phase 4: Execution Engine (Trigger.dev & FFmpeg)

Setting up the background task engine to handle heavy media processing.

## Step-by-Step Implementation

1. **Trigger.dev Tasks**
   - Implement `cropImage` task: Download image, run `ffmpeg` crop, upload to Transloadit.
   - Implement `extractFrame` task: Download video, run `ffmpeg` at timestamp, upload frame to Transloadit.

2. **Crop Image Node (`CropNode.tsx`)**
   - Sliders/inputs for % based crop parameters.
   - Input handle for `image_url`.

3. **Extract Frame Node (`ExtractFrameNode.tsx`)**
   - Simple text input for timestamp (e.g., "00:00:05" or "50%").
   - Input handle for `video_url`.

4. **"Running" UI Effect**
   - Add a `status` field to node data: `idle`, `running`, `success`, `error`.
   - Implement CSS pulsating glow using Tailwind: `animate-pulse-glow`.

## Why this way?
- **FFmpeg via Trigger.dev**: Running FFmpeg in a standard Lambda/Serverless function is difficult due to binary size. Trigger.dev (or specialized background runners) handles this environment orchestration reliably.
- **Visual Feedback**: Workflows are non-instant. The pulsing glow informs the user that something is happening under the hood.
