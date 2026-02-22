# Academy

PR-0 through PR-3 scaffold for an HTB-style learning platform monorepo.

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

Start Postgres containers:

```bash
docker compose up -d
docker compose ps
```

Expected:

- `academy-postgres-dev` is `healthy` on `localhost:5432`
- `academy-postgres-test` is `healthy` on `localhost:5433`

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

## Course Player (PR-3)

Web routes now consume the read-only content API:

- `/paths/:pathId`
- `/modules/:moduleId`
- `/learn/:sectionId`

Get seeded IDs from the API:

```bash
curl -s http://localhost:3001/v1/paths | jq
```

```bash
PATH_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].id')
MODULE_ID=$(curl -s http://localhost:3001/v1/paths/$PATH_ID | jq -r '.modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
```

Open in browser:

- `http://localhost:3000/paths/$PATH_ID`
- `http://localhost:3000/modules/$MODULE_ID`
- `http://localhost:3000/learn/$SECTION_ID`

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
- Compose defaults:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_dev?schema=public`
  - `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/academy_test?schema=public`

## Current Scope (PR-3)

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
- Read-only Content API endpoints in `apps/api`:
- `GET /v1/paths`
- `GET /v1/paths/:pathId`
- `GET /v1/modules/:moduleId`
- `GET /v1/sections/:sectionId` (published version only)
- First read-only Course Player UI in `apps/web`:
- path page (`/paths/:pathId`)
- module page (`/modules/:moduleId`)
- learn/player page (`/learn/:sectionId`)
- API e2e tests for health and content routes (requires `DATABASE_URL_TEST`)

No auth/progress/quiz execution/unlocks/gamification yet.

## Useful API Commands

```bash
pnpm --filter @academy/api prisma --version
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:reset
pnpm --filter @academy/api db:seed
pnpm --filter @academy/api test
pnpm --filter @academy/api dev
```

## Useful Web Commands

```bash
pnpm --filter @academy/web test
pnpm --filter @academy/web typecheck
pnpm --filter @academy/web dev
```

## Compose-Backed Verification Flow

```bash
docker compose up -d
cp /Users/poski/academy/apps/api/.env.example /Users/poski/academy/apps/api/.env
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:seed
pnpm --filter @academy/api test
pnpm --filter @academy/api dev
```

While API dev server is running:

```bash
curl http://localhost:3001/health
```

Expected health response:

```json
{"status":"ok","db":"ok"}
```
