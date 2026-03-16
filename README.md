# Ranky

Ranky is a small Next.js app for qualifying and ranking uploaded leads against an ideal customer persona. A user uploads a leads CSV plus a persona spec, the app normalises both inputs, runs two ranking approaches, and stores the results for review in the UI.

## How To Run Locally

### Prerequisites

- Bun installed
- A Postgres database
- An AI provider key for the ranking/normalisation steps

### Environment variables

Create `.env.local` with:

```env
DATABASE_URL=postgres://...
AI_API_KEY=...
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_VERCEL_URL=localhost:3000
```

Notes:

- `DATABASE_URL` is used by Drizzle and the app runtime.
- `AI_API_KEY` is used for persona normalisation, lead normalisation, and LLM ranking.
- `BETTER_AUTH_URL` is used by Better Auth on the server.
- `NEXT_PUBLIC_VERCEL_URL` is optional for the client auth base URL locally.

### Install and start

```bash
bun install
bun run dev
```

Then open [http://localhost:3000](http://localhost:3000).

If you need a production build locally:

```bash
bun run build
bun run start
```

Useful checks:

```bash
bun run lint
bun run typecheck
```

## Very Brief Architecture Overview

This is a Next.js App Router application with a server-side ranking pipeline and a Postgres-backed persistence layer.

- UI: upload flow, auth screens, dashboard, and results pages built in Next.js/React.
- API: `app/api/rank/route.ts` accepts the uploaded CSV and persona input, creates a ranking job, and orchestrates the pipeline.
- Pipeline: CSV parsing, persona normalisation, lead normalisation, hard-rule filtering, and an LLM-assisted ranking pass live under `lib/pipeline`.
- Persistence: Drizzle ORM writes jobs, persona specs, leads, ranking runs, and lead results into Postgres.
- Auth: Better Auth handles email/password auth and stores auth data in Postgres through the Drizzle adapter.

High-level flow:

1. User uploads leads CSV and persona spec.
2. The server parses and normalises both inputs.
3. The app runs a hard-rules-only pass and a hard-rules-plus-LLM pass.
4. Results are stored in Postgres and shown on the results page for comparison/export.

## Key Decisions Taken

- I used a hybrid approach: deterministic hard rules first, then an LLM ranking pass for softer judgement calls.
- I kept persona input and CSV input flexible, then normalised both into stable internal structures before ranking.
- I stored raw inputs alongside normalised data and result runs so the job can be inspected later and the two approaches can be compared on the same dataset.
- I ranked leads within each company rather than only globally, because the practical goal is usually to find the best contacts at each target account.
- I kept qualification binary (`qualified` or not) to make the output immediately actionable.

## Tradeoffs Due To Time / Project Size

- I did not build a more advanced ML-based ranking system. A learned model could improve accuracy, but it would add much more setup, training/debugging time, and complexity around handling messy input formats.
- Qualification is binary instead of bucketed or confidence-based. A richer output would be more nuanced, but binary labels were faster to implement and easier to act on.
- The current implementation processes the ranking job synchronously from the API route. For a larger production system, I would likely move this to a background job/queue with progress updates.
- The LLM-powered normalisation and ranking steps favor speed of delivery and flexibility over perfect determinism.
- I focused on the core pipeline and comparison flow first, so some polish areas remain out of scope, like step-level progress updates and deeper evaluation tooling between the two ranking methods.
