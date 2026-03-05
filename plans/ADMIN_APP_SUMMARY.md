# Academy Admin Summary

_Last updated: March 5, 2026_

## Executive Summary

Academy is an HTB-style learning platform MVP running as a Turborepo monorepo with:

- Web app: Next.js (`apps/web`)
- API: NestJS + Prisma + PostgreSQL (`apps/api`)
- Shared packages: `packages/shared`, `packages/config`, `packages/content-importer`

The current system is production-oriented for core learner/admin workflows: auth lifecycle, protected learner progress, quiz and unlock logic, gamification, credits wallet read + unlock redemption, admin content import/versioning, and baseline observability/release checks.

## Product State (Admin View)

- Public discovery: landing (`/`) and course catalog (`/courses`) are public.
- Learner session model: web uses HTTP-only cookies; API uses bearer JWT.
- Protected learner routes: `/learn/:sectionId` and personalized home behaviors require valid session.
- Learning flow: progress start/update/complete, quiz attempts, completion gating, unlock evaluation, and analytics lifecycle events are active.
- Admin API surface: `/v1/admin/*` is bearer + role=`admin` only.
- Content operations: import bundle (`dryRun`/`apply`), inspect section versions, publish draft versions with conflict prechecks.

## Core Capabilities

### 1) Identity and Access

- API auth endpoints: register, login, refresh (rotating one-time refresh tokens), logout, me.
- Admin access denied contract is standardized:
  - `403 { code: "forbidden", message: "Admin access required" }`
- Basic auth abuse controls:
  - In-memory per-IP limits on login/register
  - Weak password rejection (`>= 8 chars`)

### 2) Learning Runtime

- Content read APIs for paths/modules/sections.
- Progress APIs for section/module/path/continue.
- Completion gating (`409 completion_blocked`) with explicit reasons.
- Quiz delivery + attempt scoring (MCQ + short answer with grading modes).
- Unlock engine with rule types:
  - `prereq_sections`
  - `quiz_pass`
  - `credits`
  - `min_level`
- Credits wallet read (`/v1/credits/me`) and explicit unlock redemption (`/redeem-credits`).
- Gamification summary (`/v1/gamification/me`) with idempotent XP awards.

### 3) Web UX State

- Public-first navigation (`Inicio`/`Cursos`) with optional login for anonymous users.
- Anonymous browsing of paths/modules with login-first CTA handoff when attempting protected learning actions.
- Learner UI supports onboarding/continue states, quiz interaction, blocked-completion actions, and localized Spanish (Mexico) UI copy.
- UI system includes theme tokens, reusable primitives, loading/error states, accessibility hardening, and regression contract tests.

### 4) Admin Content Lifecycle

- Importer package parses markdown bundles and supports idempotent draft upsert.
- Admin import endpoint mirrors importer behavior and returns validation summary.
- Section version endpoints provide list/preview/publish operations.
- Publish safety rails return deterministic `publish_conflict` reasons:
  - `target_not_draft`
  - `empty_lesson_blocks`
  - `quiz_required_but_missing_questions`

## API Surface Snapshot

### System

- `GET /health`
- `GET /metrics` (internal, unauthenticated, in-memory)

### Auth (`/v1/auth`)

- `POST /register`
- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me`

### Content (public, optional bearer enrichment)

- `GET /v1/paths`
- `GET /v1/paths/:pathId`
- `GET /v1/modules/:moduleId`
- `GET /v1/sections/:sectionId`

### Progress (bearer)

- `POST /v1/progress/sections/:sectionId/start`
- `PATCH /v1/progress/sections/:sectionId/position`
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/sections/:sectionId`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`
- `GET /v1/progress/continue`

### Quiz (bearer)

- `GET /v1/quizzes/sections/:sectionId`
- `POST /v1/quizzes/sections/:sectionId/attempts`
- `GET /v1/quizzes/sections/:sectionId/attempts/latest`
- `GET /v1/quizzes/sections/:sectionId/result`

### Unlocks (bearer)

- `GET /v1/unlocks/modules/:moduleId/status`
- `POST /v1/unlocks/modules/:moduleId/evaluate`
- `POST /v1/unlocks/modules/:moduleId/redeem-credits`

### Credits and Gamification (bearer)

- `GET /v1/credits/me`
- `GET /v1/gamification/me`

### Analytics

- `POST /v1/analytics/events`
- Allowed events: `section_start`, `section_complete`, `player_exit`, `player_dropoff`

### Admin (bearer + admin role)

- `POST /v1/admin/content/import`
- `GET /v1/admin/sections/:sectionId/versions`
- `GET /v1/admin/sections/:sectionId/versions/:versionId`
- `POST /v1/admin/sections/:sectionId/publish/:versionId`

## Data Model Snapshot

Primary runtime tables include:

- Content/versioning: `paths`, `modules`, `sections`, `section_versions`, `lesson_blocks`
- Auth/users: `users`, `auth_refresh_tokens`
- Progress: `user_section_progress`
- Quiz: `questions`, `quiz_attempts`, `quiz_attempt_answers`
- Unlocks: `unlock_rules`, `user_unlocks`
- Gamification: `xp_events`, `user_levels`
- Credits: `user_credits`, `credit_events`
- Analytics: `analytics_events`

## Operations and Release Readiness

- Request tracing and logs: `x-request-id` + structured request logs.
- Metrics include auth failures, request counters, gating and admin conflict counters.
- Release assets:
  - Checklist: `plans/RELEASE_CHECKLIST_PR41.md`
  - Smoke command: `pnpm release:smoke`
  - CI workflow: `.github/workflows/release-smoke.yml`
- Web regression guardrail command: `pnpm web:regression`.

## Environment Baseline

- API env: `DATABASE_URL`, `DATABASE_URL_TEST`, `JWT_*`, auth rate-limit knobs.
- Web env: `API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`.
- Local default ports:
  - Web: `3000`
  - API: `3001`
  - Postgres dev/test via docker compose (`5432`/`5433`)

## Known Gaps / Next Focus

- `/metrics` is process-local (no persistent metrics backend).
- Analytics endpoint is unauthenticated by design in current phase.
- External observability plumbing (dashboards/alerts/log shipping) is not wired yet.
- Credits feature is currently oriented to unlock redemption path; broader spend/redemption products are future scope.
