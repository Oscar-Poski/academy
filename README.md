# Academy

PR-0/PR-1 scaffold for an HTB-style learning platform monorepo.

## Stack

- Monorepo: Turborepo + pnpm workspaces
- Web: Next.js 14 (`apps/web`)
- API: NestJS 10 (`apps/api`)
- DB: Prisma ORM + PostgreSQL (`apps/api/prisma`)
- Shared package: `packages/shared`
- Shared config package: `packages/config`

## Repository Layout

- `/Users/poski/academy/apps/web`
- `/Users/poski/academy/apps/api`
- `/Users/poski/academy/packages/shared`
- `/Users/poski/academy/packages/config`

## Prerequisites

- Node.js 20+
- `corepack` and `pnpm` available in shell

If you use `nvm`, ensure the Node bin path is loaded in your shell init.

## Install

```bash
pnpm install
```

## API Database Setup (PR-1)

Copy environment variables:

```bash
cp /Users/poski/academy/apps/api/.env.example /Users/poski/academy/apps/api/.env
```

Run migrations and seed:

```bash
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:seed
```

## Run

Run both apps in parallel:

```bash
pnpm dev
```

Default ports:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- API health endpoint: `http://localhost:3001/health`

Run a single app:

```bash
pnpm --filter @academy/web dev
pnpm --filter @academy/api dev
```

## Validate

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Environment Notes

`apps/web` reads `API_BASE_URL` for API calls.

- If unset or blank, it falls back to `http://localhost:3001`.
- If set, it should be a full origin (example: `http://localhost:3001`).

`apps/api` expects:

- `DATABASE_URL` for local/dev runtime
- `DATABASE_URL_TEST` for tests (required; tests fail fast if missing)

## Current Scope (PR-1)

- Monorepo scaffolding and tooling
- Prisma setup in `apps/api` with migrations and seed
- Initial Postgres schema includes `users`
- Initial Postgres schema includes `paths`
- Initial Postgres schema includes `modules`
- Initial Postgres schema includes `sections`
- Initial Postgres schema includes `section_versions`
- Initial Postgres schema includes `lesson_blocks`
- NestJS health endpoint with DB check (`GET /health -> {"status":"ok","db":"ok"}`)
- Next.js homepage showing basic API health status
- API e2e test verifies DB-backed health route (requires `DATABASE_URL_TEST`)

No content/progress/quiz/unlocks APIs yet.

## Useful API Commands

```bash
pnpm --filter @academy/api prisma --version
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:reset
pnpm --filter @academy/api db:seed
pnpm --filter @academy/api test
pnpm --filter @academy/api dev
```
