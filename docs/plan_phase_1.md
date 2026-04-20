# Phase 1: Foundation & Project Setup

This phase focuses on setting up the structural backbone of NextFlow.

## Step-by-Step Implementation

1. **Initialize Project**
   - Run `npx create-next-app@latest .` with TypeScript, Tailwind CSS, and App Router.
   - Clean up boilerplate code and setup a clean `layout.tsx`.

2. **Core Dependencies**
   - Install `reactflow`, `zustand`, `lucide-react`, `clsx`, `tailwind-merge`.
   - Install `@clerk/nextjs` for authentication.
   - Install `prisma` and `@prisma/client`.

3. **Authentication (Clerk)**
   - Configure `.env.local` for Clerk keys.
   - Add `ClerkProvider` to `layout.tsx`.
   - Create middleware to protect workflow routes.

4. **Database (Neon & Prisma)**
   - Initialize Prisma: `npx prisma init`.
   - Setup `User`, `Workflow`, `Node`, and `Edge` models in `schema.prisma`.
   - Connect to Neon PostgreSQL.

5. **Trigger.dev Setup**
   - Run `npx trigger.dev@latest init`.
   - Verify the local development environment connects successfully.

6. **Base Layout UI**
   - Create a `components/layout/Navbar.tsx` and `components/layout/Shell.tsx`.
   - Implement the collapsible sidebar logic for the left and right panels.
   - Ensure a "dark-first" theme matching Krea.ai (Slate/Zinc palette).

## Why this way?
- **Next.js App Router**: Provides the best performance and simplified routing for our multi-sidebar interface.
- **Clerk**: Handles complex auth flows (linking users to workflows) with minimal overhead.
- **Prisma**: Type-safe database access allows us to catch errors during development rather than at runtime.
