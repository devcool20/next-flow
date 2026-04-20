# Phase 3 Documentation: Input Nodes & File Processing

## What We Did
We successfully implemented the primary user input nodes that feed data into the workflow graph.

- **TextNode.tsx**: Built a multi-line auto-resizing text area node, binding its value directly to the global Zustand node data store.
- **ImageUploadNode.tsx**: Implemented a drag-and-drop file upload target specifically for images (png, jpg, webp). It supports temporary object blob URLs for instant visual preview while simulating real backend upload conditions.
- **VideoUploadNode.tsx**: Built a similar upload node for video files (mp4, mov). It parses and renders the uploaded video with a silent looping auto-player mimicking the NextFlow aesthetic.
- **Node Wiring**: Connected all three new node types to the `WorkflowCanvas.tsx` React Flow instances. Now dragging generic types from the sidebar correctly instantiates these rich components.

## How and Why We Did It

### 1. Direct State Binding (Zustand)
* **How:** In each node (`text`, `image`, `video`), we call `updateNodeData(id, { ... })` whenever the inner HTML input or file target experiences an `onChange` event.
* **Why:** In traditional React Flow, forms inside nodes can get out of sync with the underlying node array. By immediately pushing DOM changes up to the Zustand `nodes` array, we ensure that when the Workflow Engine eventually traverses the DAG, it reads the absolute latest input string or URL right from node memory.

### 2. Mimicking Media Uploads (Blob URLs)
* **How:** We used `URL.createObjectURL(file)` on the `onChange` event of the hidden file `input`.
* **Why:** The instructions specify an external Transloadit queue for finalized images and videos. However, visual responsiveness is crucial. Object URLs give an instant, visually verified result in the UI (preventing double clicks) while placing the node in a "running" state that will eventually convert to a Transloadit CDN URL in production execution.

With data ingestion built, we will now proceed to **Phase 4: Execution Engine (Trigger.dev & FFmpeg)** to build asynchronous transformer nodes.
