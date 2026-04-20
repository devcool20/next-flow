# Phase 4 Documentation: Execution Engine (Trigger.dev & FFmpeg)

## What We Did
We successfully laid the groundwork for handling long-running background tasks by implementing Trigger.dev tasks and their corresponding UI nodes.

- **CropNode.tsx**: Configured a node interface allowing users to slice percentages of X, Y, Width, and Height for an incoming image.
- **ExtractFrameNode.tsx**: Built a node interface to request specific frame captures from video inputs via a timestamp.
- **Trigger Tasks (`cropImage.ts`, `extractFrame.ts`)**: Built Serverless action definitions utilizing `@trigger.dev/sdk/v3`.
- **Node Wiring & UI**: Wired up the new Canvas nodes and bound their UI elements exactly to the Zustand store, ready to be dispatched to these Trigger tasks during a graph run sequence.

## How and Why We Did It

### 1. Trigger.dev Decoupling
* **How:** We built discrete task definitions that accept strict JSON payloads and return deterministic outputs. We mocked the immediate literal FFmpeg spawn logic to prevent immediate local crashing, but structured the code exactly as required for the production runtime. 
* **Why:** Calling out to FFmpeg from a Next.js App Router endpoint is problematic. Standard API routes time out in Vercel after 15 to 30 seconds, leading to dropped tasks. Trigger.dev guarantees execution, retries, and allows the frontend to safely decouple and await a webhook/poll indicating task completion.

### 2. Pulsating Glow Status
* **How:** We bound the `status` string (`idle`, `running`, `success`) to the React Flow node `data` object, which `BaseNode` relies on to inject the Tailwind class `animate-pulse-glow` onto its container.
* **Why:** In node-graph UX, user visibility into pipeline state is paramount. A task that takes 20 seconds requires a literal beacon indicating "work is occurring".

We are now ready for **Phase 5: LLM Integration (Gemini)**, where we build the core generative AI brain of the tool.
