# Phase 2: Core Canvas & Node System

This phase transforms the empty layout into a functional workflow workbench.

## Step-by-Step Implementation

1. **React Flow Integration**
   - Implement `WorkflowCanvas.tsx` in `src/components/canvas`.
   - Setup basic state hooks for `nodes` and `edges`.
   - Add `Background` (dots) and `Controls`.

2. **Custom Node Foundation**
   - Create `src/components/nodes/BaseNode.tsx`.
   - Implement the "Krea Style": Rounded corners, glassmorphism border, title bar with icon, and custom handles.
   - Setup `Handle` positioning for multi-input/output support.

3. **Zustand Store (`src/lib/store.ts`)**
   - Define the `useWorkflowStore`.
   - Implement actions: `addNode`, `onNodesChange`, `onEdgesChange`, `onConnect`, `updateNodeData`.

4. **Drag & Drop Logic**
   - Implement Sidebar items that work with HTML5 Drag API.
   - Implement `onDrop` handler on the Canvas to calculate position and add new nodes.

5. **Edge Styling**
   - Customize connection lines to match Krea.ai (smooth curves, animated "marching ants" effect).

## Why this way?
- **Zustand**: Much faster than React Context for high-frequency updates like node dragging.
- **BaseNode Wrapper**: By abstracting common UI elements (title, status, handles) into a wrapper, we ensure consistency across all 6 specialized node types.
