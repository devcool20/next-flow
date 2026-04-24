This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

`npm run dev` starts Next.js only and sends workflow runs to Trigger.dev via API (cloud worker path).

If you explicitly need a local Trigger worker for debugging only:

```bash
npm run dev:trigger
```

If local `POST /api/run` fails immediately with a Trigger key message, check:

- `TRIGGER_SECRET_KEY` should be `tr_prod_...` for cloud-worker execution.
- Set `NEXTFLOW_ALLOW_DEV_TRIGGER_KEY=true` only when you intentionally run `npm run dev:trigger`.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Trigger.dev Production Setup (Required)

`llm`, `crop`, and `extract` nodes are executed through Trigger.dev tasks.

1. Deploy Trigger tasks to prod:

```bash
npx trigger.dev@latest deploy --env prod
```

2. Set Vercel environment variables:

- `TRIGGER_SECRET_KEY` must be a prod key (`tr_prod_...`)
- `GEMINI_API_KEY`
- `TRIGGER_PROJECT_REF` (recommended to match `trigger.config.ts`)

3. Do not use `tr_dev_...` in production:

- Local dev key + local Trigger worker can make local runs pass while production queues and times out.
- The API now rejects this misconfiguration with a clear error.

## Async Orchestration + Fail-Fast Behavior

Workflow execution is now asynchronous:

- `POST /api/run` immediately queues a Trigger orchestration task and returns `202`.
- The right sidebar polls `GET /api/runs` for queued/running/success/partial/failed states.
- Stale non-starting Trigger runs are failed fast (default: ~20s).

Environment knobs:

- `NEXTFLOW_TRIGGER_FAIL_FAST_MS` (default `20000`)
- `NEXTFLOW_MAX_DATA_URL_CHARS_FOR_DB` (default `100000`)
- `NEXTFLOW_MAX_STRING_CHARS_FOR_DB` (default `8000`)

## Required Deploy Steps After Pulling

1. Apply Prisma schema changes:

```bash
npx prisma migrate deploy
```

2. Deploy Trigger tasks (includes `orchestrate-workflow-run`):

```bash
npx trigger.dev@latest deploy --env prod
```

3. Verify production env parity:

- `TRIGGER_SECRET_KEY` (`tr_prod_...`)
- `TRIGGER_PROJECT_REF`
- `DATABASE_URL`
- `GEMINI_API_KEY`
