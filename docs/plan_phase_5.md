# Phase 5: LLM Integration (Gemini)

Connecting the workflow to Google Gemini for multimodal reasoning.

## Step-by-Step Implementation

1. **Gemini Trigger Task**
   - Implement `runLLM` task in Trigger.dev.
   - Use `@google/generative-ai` to call Gemini 1.5 Flash (or Pro).
   - Logic to parse image URLs and include them in the prompt.

2. **LLM Node (`LLMNode.tsx`)**
   - Dropdown for model selection (Gemini 1.5 Flash, Pro).
   - Dynamic handles for `system_prompt`, `user_message`, and `images`.
   - Collapsible response area.

3. **Inline Results**
   - Use `react-markdown` to render the LLM response directly inside the node once the task completes.

## Why this way?
- **Multimodal Inputs**: Gemini is class-leading for tasks involving both text and images.
- **Inline Display**: Keeping the output on the node itself (vs a separate log) maintains the "Canvas as Source of Truth" UI pattern found in Krea.ai.
