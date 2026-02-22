# Academy

PR-0 through PR-9 scaffold for an HTB-style learning platform monorepo.

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

## Course Player (PR-3, PR-5, PR-6, PR-7, PR-8, PR-9)

Web routes now consume the read-only content API:

- `/paths/:pathId`
- `/modules/:moduleId`
- `/learn/:sectionId`

Version-aware section retrieval (PR-5):
- `GET /v1/sections/:sectionId` optionally accepts `x-user-id`
- If the user has progress pinned to an older section version, the API returns that version instead of the current published version

Web progress indicators (PR-6):
- `/paths/:pathId` now shows path-level progress summary and per-module progress chips
- `/modules/:moduleId` now shows module-level summary and per-section status badges (`Not Started`, `In Progress`, `Completed`)
- If progress is unavailable (API down or `NEXT_PUBLIC_TEMP_USER_ID` missing), pages still render and show a non-fatal notice

Player progress chip (PR-7):
- `/learn/:sectionId` now shows a player-header progress chip (status + completion %) when section progress is available
- Player page still renders if progress calls fail; chip is omitted as a non-fatal fallback

Player completion CTA (PR-8):
- `/learn/:sectionId` footer now includes a `Mark Complete` button wired to the existing progress complete endpoint
- CTA shows pending/success/error states without breaking navigation
- On success, the player refreshes so the server-rendered progress chip updates to `Completed / 100%`

Footer navigation checkpoint save (PR-9):
- Clicking `Previous Section` / `Next Section` in the player footer now performs a best-effort progress position save before navigating
- The UI still navigates even if the position update fails (API unavailable or temp user missing)

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

## Progress Tracking (PR-4)

Progress endpoints are available in `apps/api` (temporary user strategy using `x-user-id` header):

- `POST /v1/progress/sections/:sectionId/start`
- `GET /v1/progress/sections/:sectionId`
- `PATCH /v1/progress/sections/:sectionId/position`
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`
- `GET /v1/progress/continue`

Get a real seeded `users.id` (used for `x-user-id` and the web continue card):

```bash
USER_ID=$(docker exec academy-postgres-dev psql -U postgres -d academy_dev -tAc "select id from users where email='student@academy.local' limit 1;")
echo "$USER_ID"
```

Set the web temp user env before starting the web app:

```bash
export NEXT_PUBLIC_TEMP_USER_ID="$USER_ID"
export NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
```

Important: restart `pnpm --filter @academy/web dev` after changing `NEXT_PUBLIC_*` env vars.  
Next.js server components read env from the running dev server process.

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

`apps/web` progress/continue behavior (PR-4) also expects:

- `NEXT_PUBLIC_TEMP_USER_ID` = existing `users.id` (temporary MVP strategy, no auth yet)
- `NEXT_PUBLIC_API_BASE_URL` (optional; defaults to `http://localhost:3001` in the web API clients)

`apps/api` expects:

- `DATABASE_URL` for local/dev runtime
- `DATABASE_URL_TEST` for tests (required; tests fail fast if missing)
- Compose defaults:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_dev?schema=public`
  - `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/academy_test?schema=public`

## Current Scope (PR-9)

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
- Authoritative progress tracking in `apps/api` (temporary `x-user-id`, no auth yet)
- Continue learning API + homepage continue card in `apps/web`
- Version-aware section retrieval in `apps/api` using optional `x-user-id` and progress-pinned `sectionVersionId`
- Web path/module progress indicators (read-only wiring to existing progress endpoints)
- Read-only section progress endpoint (`GET /v1/progress/sections/:sectionId`) in `apps/api`
- Player header progress chip on `/learn/:sectionId` in `apps/web`
- Player footer `Mark Complete` CTA on `/learn/:sectionId` in `apps/web` (uses existing complete endpoint)
- Player footer prev/next navigation performs best-effort position save (`PATCH /v1/progress/sections/:sectionId/position`) before route change
- API e2e tests for health, content, and progress routes (requires `DATABASE_URL_TEST`)

No auth/quiz execution/unlocks/XP/credits/gamification yet.

## Useful API Commands

```bash
pnpm --filter @academy/api prisma --version
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:reset
pnpm --filter @academy/api db:seed
pnpm --filter @academy/api test
pnpm --filter @academy/api dev
```

## Useful Progress Curl Commands

```bash
PATH_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].id')
MODULE_ID=$(curl -s http://localhost:3001/v1/paths/$PATH_ID | jq -r '.modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
```

```bash
curl -s -X POST -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/sections/$SECTION_ID/start" | jq
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/sections/$SECTION_ID" | jq
curl -s -X PATCH -H "x-user-id: $USER_ID" -H "Content-Type: application/json" -d '{"last_block_order":2,"time_spent_delta":15,"completion_pct":50}' "http://localhost:3001/v1/progress/sections/$SECTION_ID/position" | jq
curl -s -X POST -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/sections/$SECTION_ID/complete" | jq
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/modules/$MODULE_ID" | jq
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/paths/$PATH_ID" | jq
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/continue" | jq
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
