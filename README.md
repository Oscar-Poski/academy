# Academy

PR-0 through PR-26 scaffold for an HTB-style learning platform monorepo.

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

PR-26 auth schema foundation:
- database now includes `users.role`, `users.password_hash`, and `auth_refresh_tokens`
- seeded local users:
  - learner: `student@academy.local` / `password123`
  - admin: `admin@academy.local` / `admin123`
- auth HTTP endpoints (`/v1/auth/login`, `/v1/auth/me`) are available in PR-27

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

## Course Player (PR-3, PR-5, PR-6, PR-7, PR-8, PR-9, PR-11, PR-23, PR-31)

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
- If progress is unavailable (API down or unauthenticated session), pages still render and show a non-fatal notice

Player progress chip (PR-7):
- `/learn/:sectionId` now shows a player-header progress chip (status + completion %) when section progress is available
- Player page still renders if progress calls fail; chip is omitted as a non-fatal fallback

Player completion CTA (PR-8):
- `/learn/:sectionId` footer now includes a `Mark Complete` button wired to the existing progress complete endpoint
- CTA shows pending/success/error states without breaking navigation
- On success, the player refreshes so the server-rendered progress chip updates to `Completed / 100%`

Footer navigation checkpoint save (PR-9):
- Clicking `Previous Section` / `Next Section` in the player footer now performs a best-effort progress position save before navigating
- The UI still navigates even if the position update fails (API unavailable or unauthenticated session)

Player analytics emission (PR-11):
- `/learn/:sectionId` emits a best-effort `section_start` analytics event on page load after progress start succeeds
- Clicking `Mark Complete` emits a best-effort `section_complete` analytics event after successful completion
- Analytics failures do not block page render, completion, or navigation UX

Locked-state web rendering (PR-23):
- path/module/player navigation now renders locked badges and reason messaging from content lock metadata
- locked modules/sections/next navigation are non-clickable in the web UI
- if lock metadata is missing (anonymous/unknown user context), UI falls back to the existing clickable behavior

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

## Progress Tracking (PR-4, PR-24)

Progress endpoints are available in `apps/api` (temporary user strategy using `x-user-id` header):

- `POST /v1/progress/sections/:sectionId/start`
- `GET /v1/progress/sections/:sectionId`
- `PATCH /v1/progress/sections/:sectionId/position`
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`
- `GET /v1/progress/continue`

PR-24 completion gating:
- `POST /v1/progress/sections/:sectionId/complete` now enforces backend gating
- quiz sections require latest quiz attempt to be passing before completion
- unlock-aware checks are applied server-side during completion
- already-completed sections remain idempotent (returns completed state without re-gating)
- self-prerequisite unlock reasons for the current section are ignored in completion checks to avoid deadlock
- blocked completion returns `409` with `code: "completion_blocked"` and gating reasons

## Auth API (PR-30)

Auth MVP endpoints are now available in `apps/api`:

- `POST /v1/auth/login` with `{ email, password }`
- `POST /v1/auth/refresh` with `{ refresh_token }`
- `POST /v1/auth/logout` with `{ refresh_token }`
- `GET /v1/auth/me` with `Authorization: Bearer <access_token>`

PR-28 behavior:
- login/refresh return `{ access_token, token_type, expires_in, refresh_token, refresh_expires_in }`
- refresh rotates refresh tokens as one-time-use (replay is rejected)
- logout revokes the current refresh token
- `auth/me` returns `{ id, email, name, role }` for the authenticated principal
- refresh/logout transport uses JSON body (no cookie flow yet)
- bridge mode for learner APIs: bearer auth is accepted and takes precedence over `x-user-id` when both are present
- `x-user-id` remains temporarily supported as fallback (removal planned in PR-32)

PR-30 admin RBAC enforcement:
- all `/v1/admin/*` endpoints are now bearer-only and require `role=admin`
- `x-user-id` is not accepted on admin endpoints
- denied admin access (missing token, invalid token, non-admin role) returns:
  - HTTP `403`
  - `{ "code": "forbidden", "message": "Admin access required" }`

PR-31 web auth plumbing:
- web app now uses HTTP-only cookie session tokens (`academy_access_token`, `academy_refresh_token`)
- new web auth routes:
  - `GET /login`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- learner routes (`/`, `/learn/:sectionId`) require authenticated web session and redirect to `/login` when missing
- content browsing routes (`/paths/:pathId`, `/modules/:moduleId`) remain anonymous-safe

Example:

```bash
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3001/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@academy.local","password":"password123"}')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" "http://localhost:3001/v1/auth/me" | jq

REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refresh_token')
curl -s -X POST "http://localhost:3001/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" | jq

curl -s -X POST "http://localhost:3001/v1/auth/logout" \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}" | jq
```

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

## Quiz Foundation (PR-16, PR-17, PR-18)

Quiz backend foundation is now present in `apps/api`:

- Prisma quiz enum/model additions:
  - `QuestionType` (`mcq`, `short_answer`)
  - `questions`
  - `quiz_attempts`
  - `quiz_attempt_answers`
- seed data now inserts deterministic quiz questions for `request-response-cycle` published v1
- `QuizModule` is registered in `AppModule`

PR-17 adds the first executable quiz endpoint:

- `POST /v1/quizzes/sections/:sectionId/attempts`
- MCQ-only scoring for now (`short_answer` is ignored in scoring in PR-17)
- persists `quiz_attempts` and `quiz_attempt_answers`
- returns attempt score/maxScore/pass state and per-question feedback
- resolves section version with progress pinning semantics (pinned published/archived first, otherwise latest published)

Example PR-17 quiz submit command:

```bash
curl -s -X POST "http://localhost:3001/v1/quizzes/sections/$SECTION_ID/attempts" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "answers": [
      {"question_id":"<MCQ_Q1_ID>","selected_option":"GET"},
      {"question_id":"<MCQ_Q2_ID>","selected_option":"2xx"}
    ]
  }' | jq
```

PR-18 expands quiz execution and read APIs:

- `POST /v1/quizzes/sections/:sectionId/attempts` now scores both `mcq` and `short_answer`
- short-answer grading modes supported: `exact`, `exact_ci`, `regex`
- `GET /v1/quizzes/sections/:sectionId/attempts/latest` returns the latest detailed attempt for the user
- `GET /v1/quizzes/sections/:sectionId/result` returns stable pass-state summary (`hasAttempt` + `latestAttempt`)

Example PR-18 quiz read commands:

```bash
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/quizzes/sections/$SECTION_ID/attempts/latest" | jq
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/quizzes/sections/$SECTION_ID/result" | jq
```

## Unlock Foundation (PR-19, PR-20, PR-21, PR-22, PR-23)

Unlock backend foundation is now present in `apps/api`:

- Prisma unlock enum/model additions:
  - `UnlockScopeType` (`path`, `module`, `section`)
  - `UnlockRuleType` (`prereq_sections`, `quiz_pass`, `credits`, `min_level`)
  - `unlock_rules`
  - `user_unlocks`
- seed now inserts a deterministic active module-scope prereq rule for `http-basics-module`
- `UnlocksModule` is registered in `AppModule`

PR-20 adds the first unlock status endpoint:

- `GET /v1/unlocks/modules/:moduleId/status` (requires `x-user-id`)
- evaluates active module-scope unlock rules (read-only; no writes to `user_unlocks`)
- initially shipped with `prereq_sections` rule evaluation and deterministic unmet reasons
- includes `requiresCredits` and `creditsCost` as informational metadata

PR-21 adds unlock evaluation and persistence:

- `POST /v1/unlocks/modules/:moduleId/evaluate` (requires `x-user-id`)
- persists module unlocks in `user_unlocks` when rules are satisfied (idempotent on retries)
- extends both status/evaluate rule evaluation to support `quiz_pass` rules
- `GET /v1/unlocks/modules/:moduleId/status` now also honors persisted module unlock grants

PR-22 adds user-aware lock metadata to content APIs (additive only):

- `GET /v1/paths/:pathId` and `GET /v1/modules/:moduleId` now accept optional `x-user-id`
- for known users, response payloads include lock metadata for modules and sections
- `GET /v1/sections/:sectionId` now includes additive navigation lock metadata for known users
- anonymous/unknown-user callers keep legacy payload shape (lock metadata omitted)

## Gamification Foundation (PR-25)

Gamification v1 is now available in `apps/api`:

- `GET /v1/gamification/me` (requires `x-user-id`) returns `{ userId, totalXp, level }`
- XP is awarded exactly once per user+section rule for:
  - first section completion (`section_complete`)
  - first quiz pass (`quiz_pass`)
- XP awards are persisted in `xp_events` with unique idempotency keys
- aggregate XP/level is stored in `user_levels`
- baseline level formula is linear: `level = floor(totalXp / 100) + 1`

## Content Importer & Admin Versioning (PR-12, PR-13, PR-14, PR-15)

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

PR-15 admin section-version endpoints:
- `GET /v1/admin/sections/:sectionId/versions` lists section versions (newest first) with `blockCount`
- `GET /v1/admin/sections/:sectionId/versions/:versionId` returns a version preview with ordered `lessonBlocks`
- `POST /v1/admin/sections/:sectionId/publish/:versionId` publishes a `draft` version and archives prior published version(s) in one transaction
- publish preserves pinned-user behavior: users pinned to the old version continue receiving it after it becomes `archived`, while public/new users receive the newly published version

Example PR-15 admin version commands:

```bash
curl -s "http://localhost:3001/v1/admin/sections/$SECTION_ID/versions" | jq
```

```bash
VERSION_ID=$(curl -s "http://localhost:3001/v1/admin/sections/$SECTION_ID/versions" | jq -r '.[0].id')
curl -s "http://localhost:3001/v1/admin/sections/$SECTION_ID/versions/$VERSION_ID" | jq
```

```bash
curl -s -X POST "http://localhost:3001/v1/admin/sections/$SECTION_ID/publish/$VERSION_ID" | jq
```

Alternative (bypasses `pnpm import` built-in command name collision):

```bash
node --import tsx /Users/poski/academy/packages/content-importer/src/cli.ts --root /Users/poski/academy/packages/content-importer/fixtures/sample-bundle
```

Notes:
- use `run import` (not just `pnpm ... import`) because `pnpm import` is a built-in pnpm command
- add `--strict` to return exit code `1` when parser errors are present
- `--apply` aborts without DB writes when parse errors are present

Set web API origin env before starting the web app:

```bash
export NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
export API_BASE_URL="http://localhost:3001"
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

`apps/web` reads `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` for API calls.

- If unset or blank, it falls back to `http://localhost:3001`.
- If set, it should be a full origin (example: `http://localhost:3001`).
- `NEXT_PUBLIC_API_BASE_URL` is used by browser requests.
- `API_BASE_URL` is used by server-side requests and route handlers.

`apps/api` expects:

- `DATABASE_URL` for local/dev runtime
- `DATABASE_URL_TEST` for tests (required; tests fail fast if missing)
- `JWT_SECRET` for access token signing/verification
- `JWT_EXPIRES_IN` access token TTL in seconds (defaults to `900` when unset/invalid)
- `JWT_REFRESH_SECRET` for refresh token signing/verification
- `JWT_REFRESH_EXPIRES_IN` refresh token TTL in seconds (defaults to `604800` when unset/invalid)
- Compose defaults:
  - `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/academy_dev?schema=public`
  - `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/academy_test?schema=public`

## Current Scope (PR-28)

- Monorepo scaffolding and tooling
- Prisma setup in `apps/api` with migrations and seed
- Initial Postgres schema includes `users`
- Initial Postgres schema includes `paths`
- Initial Postgres schema includes `modules`
- Initial Postgres schema includes `sections`
- Initial Postgres schema includes `section_versions`
- Initial Postgres schema includes `lesson_blocks`
- Auth schema foundation in `apps/api` (`users.role`, `users.password_hash`, `auth_refresh_tokens`, `UserRole`)
- Auth API MVP in `apps/api` (`POST /v1/auth/login`, `GET /v1/auth/me`) with bearer-token principal resolution
- Auth refresh/logout lifecycle in `apps/api` (`POST /v1/auth/refresh`, `POST /v1/auth/logout`) with one-time refresh rotation
- Guarded user-context bridge: progress/quiz/unlocks/gamification/content endpoints now accept bearer principal first with temporary `x-user-id` fallback
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
- Authoritative progress tracking in `apps/api` (temporary `x-user-id` bridge while auth endpoints are pending)
- Continue learning API + homepage continue card in `apps/web`
- Version-aware section retrieval in `apps/api` using optional `x-user-id` and progress-pinned `sectionVersionId`
- Web path/module progress indicators (read-only wiring to existing progress endpoints)
- Read-only section progress endpoint (`GET /v1/progress/sections/:sectionId`) in `apps/api`
- Progress completion endpoint now enforces quiz/unlock gating and returns structured `409 completion_blocked` when unmet
- Player header progress chip on `/learn/:sectionId` in `apps/web`
- Player footer `Mark Complete` CTA on `/learn/:sectionId` in `apps/web` (uses existing complete endpoint)
- Player footer prev/next navigation performs best-effort position save (`PATCH /v1/progress/sections/:sectionId/position`) before route change
- Analytics ingest baseline in `apps/api` (`analytics_events` + `POST /v1/analytics/events`)
- Analytics ingest validation + idempotency in `apps/api` (`event_name` allowlist + optional `idempotency_key`)
- Web player emits best-effort analytics events (`section_start`, `section_complete`)
- `packages/content-importer` parser + CLI for `.md/.mdx` frontmatter bundles (dry-run and `--apply` draft upsert mode)
- Importer `--apply` upserts `paths/modules/sections` and draft `section_versions` + `lesson_blocks` while preserving non-draft versions
- Admin content import endpoint in `apps/api` (`POST /v1/admin/content/import`) for `dryRun`/`apply` using the shared importer package
- Admin section version list/preview endpoints in `apps/api` (`GET /v1/admin/sections/:sectionId/versions`, `GET /v1/admin/sections/:sectionId/versions/:versionId`)
- Admin publish endpoint in `apps/api` (`POST /v1/admin/sections/:sectionId/publish/:versionId`) archives prior published version(s) and publishes a draft version transactionally
- Publish flow preserves pinned-version behavior for in-progress users (old version becomes `archived` but remains resolvable via pinned progress)
- Quiz core schema foundation in `apps/api` (`questions`, `quiz_attempts`, `quiz_attempt_answers`, `QuestionType`)
- Seeded quiz questions for published `request-response-cycle` section version
- Quiz attempts submit endpoint in `apps/api` (`POST /v1/quizzes/sections/:sectionId/attempts`) with MCQ + short-answer scoring and persisted attempt/answer rows
- Quiz latest-attempt endpoint in `apps/api` (`GET /v1/quizzes/sections/:sectionId/attempts/latest`)
- Quiz result summary endpoint in `apps/api` (`GET /v1/quizzes/sections/:sectionId/result`)
- Unlock core schema foundation in `apps/api` (`unlock_rules`, `user_unlocks`, `UnlockScopeType`, `UnlockRuleType`)
- Seeded module-scope prerequisite unlock rule for `http-basics-module`
- Unlock status endpoint in `apps/api` (`GET /v1/unlocks/modules/:moduleId/status`) with read-only prerequisite evaluation
- Unlock evaluate endpoint in `apps/api` (`POST /v1/unlocks/modules/:moduleId/evaluate`) with idempotent `user_unlocks` persistence
- Unlock evaluator now supports `quiz_pass` rules and persisted unlock grants
- Gamification schema foundation in `apps/api` (`xp_events`, `user_levels`, `XpEventType`, `XpSourceType`)
- Gamification summary endpoint in `apps/api` (`GET /v1/gamification/me`)
- XP awards on first section completion and first quiz pass per user+section rule (idempotent)
- Content API lock metadata (additive) for known users on:
- `GET /v1/paths/:pathId` (module/section lock metadata)
- `GET /v1/modules/:moduleId` (module/section lock metadata)
- `GET /v1/sections/:sectionId` (navigation lock metadata)
- Anonymous and unknown-user content requests remain backward-compatible (lock fields omitted)
- Web locked-state rendering now consumes content lock metadata in path/module/player routes (badges, reasons, disabled locked navigation)
- API e2e tests for health, content, and progress routes (requires `DATABASE_URL_TEST`)
- API e2e tests now include analytics ingest, admin content import, admin section version/publish, quiz-seed, quiz-attempts, quiz-results, unlock-seed, unlock-status, unlock-evaluate, content-lock-metadata, and gamification coverage

No auth or credits-redemption endpoints yet.

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

## Useful Unlock Curl Commands

```bash
MODULE_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
```

```bash
# Check current unlock status
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/unlocks/modules/$MODULE_ID/status" | jq

# Try to evaluate + persist unlock (idempotent)
curl -s -X POST -H "x-user-id: $USER_ID" "http://localhost:3001/v1/unlocks/modules/$MODULE_ID/evaluate" | jq

# Complete prerequisite section, then evaluate again
curl -s -X POST -H "x-user-id: $USER_ID" "http://localhost:3001/v1/progress/sections/$SECTION_ID/complete" | jq
curl -s -X POST -H "x-user-id: $USER_ID" "http://localhost:3001/v1/unlocks/modules/$MODULE_ID/evaluate" | jq
```

## Useful Gamification Curl Commands

```bash
curl -s -H "x-user-id: $USER_ID" "http://localhost:3001/v1/gamification/me" | jq
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
