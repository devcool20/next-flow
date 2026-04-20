# Phase 1 Documentation: Foundation & Project Setup

## What We Did
In Phase 1, we established the core foundation of **NextFlow**. We set up a scalable Next.js App Router project and configured the mandatory supporting services and tech stack for the entire application.

Specifically:
- Initialized Next.js with Tailwind CSS, TypeScript.
- Installed core library dependencies: `reactflow`, `zustand`, `lucide-react`.
- Integrated **Clerk** authentication.
- Set up a **Prisma** schema with `User`, `Workflow`, `WorkflowRun`, and `NodeExecution` tables to handle future features.
- Configured **Trigger.dev** structure for backend job processing.
- Created the core collapsible **Shell Layout** including the `LeftSidebar.tsx` and `RightSidebar.tsx` styled to match the dark Krea.ai theme exactly.

## How and Why We Did It

### 1. Minimal UI Shell for Krea-like Aesthetics
The design of Krea relies heavily on sidebars that slide in and out over the canvas without destroying the canvas layout.
* **How:** We built `Shell.tsx` using a fixed fullscreen layout (`h-screen overflow-hidden`) with a central `<main>` frame, flanked by sidebars that interpolate their width (`transition-all duration-300`).
* **Why:** This ensures smooth animations exactly matching the reference site. The sidebars use `#111111` for a dark premium contrast against the main background, and we mapped all primary icons.

### 2. Clerk Authentication Middleware
* **How:** We added a `middleware.ts` that enforces protected routes by default, explicitly whitelisting `/sign-in` and `/sign-up`.
* **Why:** Authentication is a strict requirement for associating workflows with a user. Clerk is deeply integrated to protect API routes early in the server request lifecycle.

### 3. Prisma Schema Design
* **How:** We defined `Workflow` explicitly holding a JSON blob for nodes and edges separately. We also created distinct tables for execution runs (`WorkflowRun`) and the sub-events nested inside them (`NodeExecution`).
* **Why:** This data architecture gives us granular control for the right sidebar's History panel. Storing React Flow's node JSON directly avoids serializing complex data structures.

This sets everything up to dive immediately into Phase 2: building the graphical canvas and our custom drag-and-drop nodes.
