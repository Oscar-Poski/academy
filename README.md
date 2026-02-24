# Academy

PR-0 through PR-14 scaffold for an HTB-style learning platform monorepo.

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
- `/Users/poski/academy/packages/content-importer`

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

## Course Player (PR-3, PR-5, PR-6, PR-7, PR-8, PR-9, PR-11)

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

Player analytics emission (PR-11):
- `/learn/:sectionId` emits a best-effort `section_start` analytics event on page load after progress start succeeds
- Clicking `Mark Complete` emits a best-effort `section_complete` analytics event after successful completion
- Analytics failures do not block page render, completion, or navigation UX

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

## Analytics Ingest (PR-10, PR-11)

Analytics baseline is now available in `apps/api`:

- Raw `analytics_events` table (Prisma/Postgres)
- `POST /v1/analytics/events` (single-event ingest)

Current PR-10 behavior:
- accepts a single raw event payload (snake_case fields)
- validates required `event_name` and `occurred_at`
- stores `received_at` server-side
- no idempotency key support yet (planned for later PR)

PR-11 additions:
- `event_name` is now validated against an allowlist (`section_start`, `section_complete`, `player_exit`, `player_dropoff`)
- optional `idempotency_key` is supported and deduplicates repeated requests
- `payload_json` must be an object when provided

## Content Importer (PR-12, PR-13, PR-14)

`packages/content-importer` now provides a markdown import parser + CLI for dry-run parsing and draft DB upserts:

- recursively scans a local bundle root for `.md` / `.mdx`
- parses frontmatter + body into normalized draft `paths/modules/sections/sectionVersions`
- converts each file body into a single `markdown` lesson block (`blockOrder = 1`)
- emits structured validation messages (errors/warnings)
- PR-13 adds `--apply` mode to upsert `paths/modules/sections` and draft `section_versions` + `lesson_blocks`
- existing `published` / `archived` section versions are preserved (skipped, not overwritten)
- repeated `--apply` runs are idempotent (draft versions update in place)
- PR-14 adds `POST /v1/admin/content/import` in `apps/api` to run the same importer logic over HTTP (`dryRun` / `apply`)

Run the importer dry-run against the included fixture bundle:

```bash
pnpm --filter @academy/content-importer run import -- --root /Users/poski/academy/packages/content-importer/fixtures/sample-bundle
```

Apply the fixture bundle to the local dev DB (`DATABASE_URL` required):

```bash
set -a; . /Users/poski/academy/apps/api/.env.example; set +a
pnpm --filter @academy/content-importer run import -- --root /Users/poski/academy/packages/content-importer/fixtures/sample-bundle --apply
```

Example PR-13 apply result (seeded DB):
- first run: creates new draft version(s) and updates existing draft version(s)
- second run: no duplicate versions created; draft versions are updated in place

Call the admin import endpoint (PR-14) using a server-local bundle path:

```bash
curl -s -X POST http://localhost:3001/v1/admin/content/import \
  -H "Content-Type: application/json" \
  -d '{
    "bundle_path": "/Users/poski/academy/packages/content-importer/fixtures/sample-bundle",
    "mode": "dryRun"
  }' | jq
```

```bash
curl -s -X POST http://localhost:3001/v1/admin/content/import \
  -H "Content-Type: application/json" \
  -d '{
    "bundle_path": "/Users/poski/academy/packages/content-importer/fixtures/sample-bundle",
    "mode": "apply"
  }' | jq
```

PR-14 endpoint behavior:
- returns `200` with importer report JSON for both `dryRun` and `apply`
- `apply` parse errors return a non-writing report (`applied: false`, `abortedReason: "parse_errors"`) instead of a request error
- invalid body or unreadable/nonexistent `bundle_path` returns `400`
- optional `CONTENT_IMPORT_ROOT` restricts allowed import paths when set in the API process environment

Alternative (bypasses `pnpm import` built-in command name collision):

```bash
node --import tsx /Users/poski/academy/packages/content-importer/src/cli.ts --root /Users/poski/academy/packages/content-importer/fixtures/sample-bundle
```

Notes:
- use `run import` (not just `pnpm ... import`) because `pnpm import` is a built-in pnpm command
- add `--strict` to return exit code `1` when parser errors are present
- `--apply` aborts without DB writes when parse errors are present

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

## Current Scope (PR-14)

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
- Analytics ingest baseline in `apps/api` (`analytics_events` + `POST /v1/analytics/events`)
- Analytics ingest validation + idempotency in `apps/api` (`event_name` allowlist + optional `idempotency_key`)
- Web player emits best-effort analytics events (`section_start`, `section_complete`)
- `packages/content-importer` parser + CLI for `.md/.mdx` frontmatter bundles (dry-run and `--apply` draft upsert mode)
- Importer `--apply` upserts `paths/modules/sections` and draft `section_versions` + `lesson_blocks` while preserving non-draft versions
- Admin content import endpoint in `apps/api` (`POST /v1/admin/content/import`) for `dryRun`/`apply` using the shared importer package
- API e2e tests for health, content, and progress routes (requires `DATABASE_URL_TEST`)
- API e2e tests now include analytics ingest and admin content import coverage

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

## Useful Analytics Curl Command

```bash
PATH_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].id')
MODULE_ID=$(curl -s http://localhost:3001/v1/paths/$PATH_ID | jq -r '.modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
SECTION_VERSION_ID=$(curl -s http://localhost:3001/v1/sections/$SECTION_ID | jq -r '.sectionVersionId')
```

```bash
curl -s -X POST "http://localhost:3001/v1/analytics/events" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name":"section_complete",
    "occurred_at":"2026-02-22T18:00:00.000Z",
    "section_id":"'"$SECTION_ID"'",
    "section_version_id":"'"$SECTION_VERSION_ID"'",
    "payload_json":{"source":"manual"}
  }' | jq
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
