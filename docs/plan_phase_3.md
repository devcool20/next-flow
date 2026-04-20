# Phase 3: Input Nodes & Media Handling

This phase enables the application to ingest text and media via Transloadit.

## Step-by-Step Implementation

1. **Text Node (`TextNode.tsx`)**
   - Simple textarea with local state.
   - Updates the node's `data.value` in the global store on change.

2. **Transloadit Integration**
   - Configure Transloadit templates for Image and Video handling in their dashboard.
   - Setup a `TransloaditUpload` component using their official React wrapper.

3. **Image Upload Node (`ImageUploadNode.tsx`)**
   - Click-to-upload area.
   - Display a preview of the uploaded image.
   - Pass the final URL to the output handle.

4. **Video Upload Node (`VideoUploadNode.tsx`)**
   - Video upload area.
   - Video player preview (muted, autoplay loop).
   - Pass the video URL to the output handle.

## Why this way?
- **Transloadit**: Offloading file persistence and optimization (CDN, resizing) ensures our app stays fast and responsive.
- **Preview UI**: Users need immediate visual feedback once a file is "in the system" to know the workflow is ready.
