# Phase 6: Orchestration & History

Building the "Brain" that connects nodes together and tracks their past.

## Step-by-Step Implementation

1. **DAG Workflow Engine**
   - Implement `src/lib/workflow-engine.ts`.
   - Logic to:
     - Find all "source" nodes (no incoming edges).
     - Build an execution queue based on a topological sort.
     - Detect and block circular loops.

2. **Parallel Task Dispatch**
   - Logic to trigger independent branches of the graph concurrently.
   - Wait for dependencies to resolve before starting child nodes.

3. **Workflow History Panel**
   - Build the list view in the `RightSidebar.tsx`.
   - Implement a "clickable run" that highlights the path taken on the canvas.
   - Node-level drilldown: Show exactly what inputs and outputs each node had in that specific run.

4. **Selective Execution UI**
   - Allow "Run Selected Only" by filtering the DAG nodes.

## Why this way?
- **Topological Sorting**: This is the computer science standard for ensuring task dependencies are met in a graph.
- **Node-Level History**: Essential for debugging. Users need to know exactly *where* a complex workflow failed.
