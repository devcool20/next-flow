# Phase 2 Documentation: Core Canvas & Node System

## What We Did
We successfully deployed the canvas where all the graphical workflow building takes place.

- **React Flow Integration**: Integrated `@xyflow/react` to provide our core nodes and edges engine.
- **WorkflowCanvas.tsx**: Built the main canvas wrapper with `ReactFlowProvider` and the required hooks `useReactFlow`.
- **Drag & Drop**: Connected the `LeftSidebar.tsx` buttons via the HTML5 `draggable` API to a custom `onDrop` handler in the Canvas that calculates project viewport coordinates.
- **BaseNode.tsx**: Built the UI shell wrapper that is standard across all NextFlow node types (containing icon, title bar, glow indicators, and standardized handles).
- **Zustand Store**: Added `useWorkflowStore` to keep node positions and connection edges synced globally.
- **Visuals**: Embedded CSS animations (`animate-pulse-glow`) in `globals.css` and adjusted the background to perfectly reflect the minimal dark-mode Krea aesthetic.

## How and Why We Did It

### 1. Abstracting the "BaseNode"
* **How:** We created `BaseNode.tsx` that exposes a `children` prop for specific node fields, while locking down the outer border, title bar, handles, and animated status effect.
* **Why:** In node-based editors, keeping node UI perfectly uniform is critical. It avoids duplicating boilerplate (like Handle placement math) and ensures design consistency across text nodes, LLM nodes, and action nodes.

### 2. Zustand State Manager
* **How:** Instead of pushing node/edge changes down via React Context, we mapped `@xyflow/react`'s native helper hooks (`applyNodeChanges`, `applyEdgeChanges`) directly to a Zustand store.
* **Why:** The graph updates at 60 FPS while dragging. Redux and standard React Context can cause massive re-render lag. Zustand maintains state external to React's fast update tree.

With the canvas prepared and nodes ready to drop, we will proceed to **Phase 3: Input Nodes & Media Processing**.
