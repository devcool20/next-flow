# Phase 5 Documentation: LLM Integration (Gemini)

## What We Did
In Phase 5, we integrated the "Brain" of the application using Google Gemini.

Specifically:
- **LLMNode.tsx**: Developed a specialized node for LLM execution. It includes a model selector (Flash vs Pro), dynamic input handles for `system_prompt`, `user_message`, and `images`, and an inline results display.
- **Markdown Rendering**: Integrated `react-markdown` to render the LLM's response directly inside the node with a collapsible UI for clean workspace management.
- **Trigger.dev Task (`runLLM.ts`)**: Created a background task that uses the `@google/generative-ai` SDK. It handles multimodal inputs (text + images) by fetching image URLs and converting them to base64 for Gemini.
- **Node Wiring**: Registered the `LLMNode` in the `WorkflowCanvas`.

## How and Why We Did It

### 1. Multi-modal Support
* **How:** The `runLLM` task is designed to iterate through an array of image URLs provided by the workflow engine. It fetches the binary data, converts it to base64, and joins it with the text prompt.
* **Why:** The primary value of this tool is complex LLM workflows. Since Gemini excels at vision tasks, we ensured the "Run Any LLM" node wasn't limited to just text.

### 2. Inline Response vs. New Node
* **How:** Results stay within the `LLMNode` data state and are rendered using a specialized output area in the component.
* **Why:** To match the Krea.ai UX exactly, we avoid cluttering the canvas with "Result Nodes." Keeping the output contextually attached to the prompt that generated it makes the workflow more readable.

### 3. Graceful Mocking
* **How:** We implemented a mock response in the Trigger task if the `GEMINI_API_KEY` is missing.
* **Why:** This allows the project to be deployed or demoed as a "Vibe UI" prototype without failing immediately on execution, while still being "one environment variable away" from full production power.

We are now moving into **Phase 6: Workflow Features & History**, where we will build the logic to actually connect these nodes and run them in sequence.
