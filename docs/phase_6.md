# Phase 6 Documentation: Workflow Features & History

## What We Did
Phase 6 introduced the orchestration layer and run history tooling:

- **DAG Workflow Engine**: Added `src/lib/workflow-engine.ts` with topological execution planning, circular dependency detection, and dependency-aware input propagation.
- **Parallel Branch Dispatch**: Nodes on the same dependency level now execute concurrently via `Promise.all`, while downstream levels wait for parent completion.
- **Store-Level Orchestration**: Expanded `src/lib/store.ts` with `runWorkflow`, `runSelectedWorkflow`, and persistent run history.
- **History + Drilldown UI**: Updated `RightSidebar.tsx` with run actions, run list, clickable run selection, and node-level input/output summaries.
- **Path Highlighting**: Selecting a historical run highlights nodes touched in that execution path.

## How and Why We Did It

### 1. Topological Levels over Sequential Loops
* **How:** The engine computes indegrees and emits execution levels. Every level is executed together, then the engine advances.
* **Why:** This preserves dependency correctness while maximizing parallelism for independent branches.

### 2. Input Resolution from Edges
* **How:** Each node receives an input map built from upstream edge handles (`sourceHandle -> targetHandle`), with fan-in merged as arrays.
* **Why:** This makes node execution deterministic and keeps the graph wiring as the single source of truth.

### 3. Persistent History for Debuggability
* **How:** Every run stores node-level records (`inputs`, `outputs`, timestamps, status), plus an execution path.
* **Why:** Users can inspect exact node behavior in past runs, which is essential for debugging complex workflows.

### 4. Selective Execution
* **How:** `runSelectedWorkflow` filters the graph to selected nodes and executes only the induced subgraph.
* **Why:** This enables targeted iteration without rerunning the entire workflow each time.
