# Contributing to Mashhad

Thanks for your interest in contributing. This guide focuses on making contributions easy to review, safe to ship, and consistent with the current codebase.

## Quick Start

### 1) Prerequisites

- Node.js 18+ (CI uses Node 20)
- npm
- A Clerk application (for auth)
- A Supabase project (for database + RLS)
- API keys for the external providers you want to test (TMDB, Real-Debrid, subtitles, etc.)

### 2) Install

```bash
npm ci
```

### 3) Configure environment

Create `.env.local` (never commit it). Use `.env.example` as a template.

### 4) Run locally

```bash
npm run dev
```

Open http://localhost:3000.

## Development Workflow

### Branching

- Create a branch from `main`
- Use short, descriptive names:
  - `fix/subtitle-sync-score`
  - `feat/health-endpoint`
  - `chore/ci-playwright`

### Code Quality

Before opening a PR, run:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

If you changed UI behavior, include screenshots or a short screen recording.

### Commit Messages

Use clear, review-friendly messages. Conventional Commits are welcome but not required.

Examples:

- `fix: prevent SSRF in subtitle download`
- `feat: add stream server fallback telemetry`
- `docs: update env variable list`

## Project Conventions

### Security & Secrets

- Never commit `.env.local`, API tokens, or real keys.
- If you add a debugging script under `scratch/`, keep it free of embedded credentials.
- Be extra careful with proxy routes and any server-side fetch.

### i18n

- Avoid hard-coded UI strings.
- Keep Arabic and English coverage consistent.
- Ensure RTL/LTR layout remains correct.

### API routes

- Prefer returning structured JSON and clear status codes.
- Avoid logging secrets, tokens, headers, or request bodies that may contain credentials.

## Database (Supabase)

Migrations live under `supabase/migrations/`.

If you add or change schema:

- Add a new migration file (do not edit old migrations once merged)
- Keep RLS policies tight and explicit
- Include indexes for high-cardinality query paths when needed

## Pull Requests

### What to include

- A description of the change and why it’s needed
- The affected routes or modules
- Any trade-offs
- Testing notes (what you ran)

### What to avoid

- Large refactors mixed with product changes
- Reformat-only PRs unless agreed ahead of time

## Getting Help

If you’re unsure about an approach, open a draft PR early and describe what you’re trying to do.
