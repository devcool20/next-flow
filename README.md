# NextFlow: Visual AI Workflow Builder

NextFlow is a powerful, pixel-perfect visual workflow builder inspired by modern AI tools like Krea.ai. It allows users to orchestrate complex data flows involving LLMs, image processing, and video extraction through an intuitive, drag-and-drop canvas.

![NextFlow Banner](https://placehold.co/1200x400/1a1a1a/ffffff?text=NextFlow+Visual+Workflow+Builder)

## 🏗️ Technical Architecture

NextFlow follows a decoupled architecture, separating the UI orchestration from heavy-duty background tasks. This ensures stability, observability, and the ability to handle long-running operations like video processing without timing out.

```mermaid
graph TD
    User((User)) --> NextJS[Next.js Frontend / React Flow]
    NextJS --> Zustand[Zustand State Management]
    Zustand --> API[Next.js API Routes]
    API --> Prisma[Prisma ORM]
    Prisma --> DB[(Neon PostgreSQL)]
    API --> Trigger[Trigger.dev Orchestrator]
    Trigger --> Tasks[Background Tasks: LLM, FFmpeg]
    Tasks --> Files[Transloadit File Storage]
```

### Key Components
- **Canvas Engine**: Built on [React Flow](https://reactflow.dev/) for a smooth, interactive node-based experience.
- **Orchestration**: Powered by [Trigger.dev](https://trigger.dev/) to handle long-running background tasks with built-in retries and observability.
- **Media Processing**: Utilizes [Transloadit](https://transloadit.com/) and **FFmpeg** for high-quality image cropping and video frame extraction.
- **AI Intelligence**: Integrated with **Google Gemini** for advanced text generation and analysis.

## 🚀 Getting Started

Follow these steps to get your local development environment up and running.

### Prerequisites
- Node.js (v20 or higher)
- A PostgreSQL database (e.g., [Neon](https://neon.tech/))
- [Trigger.dev](https://trigger.dev/) account
- [Clerk](https://clerk.com/) account for authentication
- [Google Gemini API Key](https://aistudio.google.com/)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/next-flow.git
cd next-flow
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory and add the following:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database
DATABASE_URL=postgresql://user:password@ep-example-pooler.us-east-1.aws.neon.tech/dbname?sslmode=require
DIRECT_URL=postgresql://user:password@ep-example.us-east-1.aws.neon.tech/dbname?sslmode=require

# AI (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key

# Trigger.dev
TRIGGER_SECRET_KEY=tr_dev_...
TRIGGER_PROJECT_REF=proj_...

# Transloadit
TRANSLOADIT_KEY=...
TRANSLOADIT_SECRET=...
TRANSLOADIT_TEMPLATE_ID_IMAGE=...
TRANSLOADIT_TEMPLATE_ID_VIDEO=...
```

### 3. Database Setup
Push the Prisma schema to your database:
```bash
npx prisma db push
```

### 4. Running the Development Server
You need to run both the Next.js development server and the Trigger.dev dev worker:

**Terminal 1 (Next.js):**
```bash
npm run dev
```

**Terminal 2 (Trigger.dev):**
```bash
npm run dev:trigger
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🧩 Core Node Types

- **LLM Node**: Generate text using Gemini 2.5 Flash/Pro.
- **Image Node**: Upload and process images.
- **Video Node**: Extract frames and process video files.
- **Text Node**: Static text inputs for prompts or notes.
- **Trigger Node**: Entry point for manual workflow execution.

## ☁️ Deployment

### Vercel Deployment
1. Connect your repository to Vercel.
2. Add all environment variables from your `.env` file to Vercel's project settings.
3. Ensure the `BUILD` command includes Prisma generation: `npm run build`.

### Trigger.dev Production
Deploy your background tasks to Trigger.dev:
```bash
npx trigger.dev@latest deploy --env prod
```
Ensure your `TRIGGER_SECRET_KEY` in Vercel is set to the production key (`tr_prod_...`).

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **UI & Styling**: [React Flow](https://reactflow.dev/), [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database & ORM**: [Neon (PostgreSQL)](https://neon.tech/), [Prisma](https://www.prisma.io/)
- **Task Orchestration**: [Trigger.dev](https://trigger.dev/)
- **AI**: [Google Generative AI (Gemini)](https://ai.google.dev/)
- **Media**: [Transloadit](https://transloadit.com/), [FFmpeg](https://ffmpeg.org/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)

---
Built with ❤️ by the NextFlow Team.
