# Academy App Summary (Admin View)

As of February 28, 2026, this repo is a production-oriented learning platform MVP with a Next.js web app (`apps/web`) and NestJS API (`apps/api`) backed by Prisma/PostgreSQL.

## 1) Current Capability Snapshot

- Bearer-authenticated learner APIs for progress, quiz, unlocks, gamification, and credits wallet.
- Full auth token lifecycle: login, access token, refresh rotation, logout invalidation.
- Admin RBAC enforcement on `/v1/admin/*` (bearer token + `role=admin`).
- Interactive quiz delivery and submission flow on `/learn/:sectionId`.
- Completion gating UX with explicit blocked reasons and unblock actions.
- Unlock engine with `prereq_sections`, `quiz_pass`, `credits`, and `min_level` rules.
- Explicit credits redemption endpoint for credit-gated unlocks.
- Analytics ingest with event contract validation + idempotency.
- Observability foundation: `x-request-id`, structured request logs, `/metrics`, release smoke/checklist.

## 2) Core Runtime Flows

### Learner flow (web)

1. User signs in at `/login`; web stores access/refresh in HTTP-only cookies (`academy_access_token`, `academy_refresh_token`).
2. Protected learner routes (`/`, `/learn/:sectionId`) require a valid session; content browsing routes remain public.
3. Learn page starts progress, supports checkpoint saves, completion, quiz interactions, and lifecycle analytics (`section_start`, `section_complete`, `player_exit`, `player_dropoff`).
4. Completion failures with `409 completion_blocked` are shown inline with actionable controls (`Go to Quiz`, `Evaluate Unlock`).

### Auth flow (API)

1. `POST /v1/auth/login` validates credentials and returns access + refresh tokens.
2. `POST /v1/auth/refresh` rotates refresh token one-time and issues new token pair.
3. `POST /v1/auth/logout` revokes the provided refresh token.
4. `GET /v1/auth/me` resolves current principal from bearer token.

### Unlock + credits flow (API)

1. Read lock state: `GET /v1/unlocks/modules/:moduleId/status`.
2. Evaluate/persist unlock: `POST /v1/unlocks/modules/:moduleId/evaluate` (no auto-credit-spend).
3. Explicit credit spend path: `POST /v1/unlocks/modules/:moduleId/redeem-credits` (strict, idempotent).
4. Wallet read: `GET /v1/credits/me`.

### Admin content flow (API)

1. Import content bundle via `POST /v1/admin/content/import` (`dryRun`/`apply`).
2. Review section versions:
   - `GET /v1/admin/sections/:sectionId/versions`
   - `GET /v1/admin/sections/:sectionId/versions/:versionId`
3. Publish draft version: `POST /v1/admin/sections/:sectionId/publish/:versionId`.
4. Publish prechecks enforce deterministic `409 publish_conflict` reasons.

## 3) API Endpoint Map (Current Contracts)

### System + observability

- `GET /health`
- `GET /metrics` (internal, unauthenticated, in-memory counters)

### Auth (`/v1/auth`)

- `POST /login`
- `POST /refresh`
- `POST /logout`
- `GET /me` (bearer required)

### Content (public, optional bearer enrichment)

- `GET /v1/paths`
- `GET /v1/paths/:pathId`
- `GET /v1/modules/:moduleId`
- `GET /v1/sections/:sectionId`

`x-user-id` is ignored globally; optional enrichment comes only from valid bearer principal.

### Progress (bearer required)

- `POST /v1/progress/sections/:sectionId/start`
- `PATCH /v1/progress/sections/:sectionId/position`
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/sections/:sectionId`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`
- `GET /v1/progress/continue`

### Quiz (bearer required)

- `GET /v1/quizzes/sections/:sectionId` (delivery; no answer-key leakage)
- `POST /v1/quizzes/sections/:sectionId/attempts`
- `GET /v1/quizzes/sections/:sectionId/attempts/latest`
- `GET /v1/quizzes/sections/:sectionId/result`

### Unlocks (bearer required)

- `GET /v1/unlocks/modules/:moduleId/status`
- `POST /v1/unlocks/modules/:moduleId/evaluate`
- `POST /v1/unlocks/modules/:moduleId/redeem-credits`

### Credits (bearer required)

- `GET /v1/credits/me`

### Gamification (bearer required)

- `GET /v1/gamification/me`

### Analytics

- `POST /v1/analytics/events`
- Allowed events: `section_start`, `section_complete`, `player_exit`, `player_dropoff`
- Funnel payload contract violations return:
  - `400 { code: "invalid_analytics_payload", message, details[] }`

### Admin (bearer + admin role required)

- `POST /v1/admin/content/import`
- `GET /v1/admin/sections/:sectionId/versions`
- `GET /v1/admin/sections/:sectionId/versions/:versionId`
- `POST /v1/admin/sections/:sectionId/publish/:versionId`

Denied admin access is standardized to:
- `403 { code: "forbidden", message: "Admin access required" }`

## 4) Data Model Snapshot

Primary PostgreSQL tables in active runtime:

- Content/versioning: `paths`, `modules`, `sections`, `section_versions`, `lesson_blocks`
- User/auth: `users`, `auth_refresh_tokens`
- Quiz: `questions`, `quiz_attempts`, `quiz_attempt_answers`
- Progress: `user_section_progress`
- Unlocks: `unlock_rules`, `user_unlocks`
- Gamification: `xp_events`, `user_levels`
- Credits: `user_credits`, `credit_events`
- Analytics: `analytics_events`

## 5) Identity + Security Model

- Protected learner endpoints are bearer-only.
- `/v1/admin/*` is bearer-only plus role enforcement (`admin`).
- Legacy `x-user-id` identity path has been removed from runtime behavior.
- Web session transport is cookie-backed; API auth transport is bearer JWT.

## 6) Admin Safety Rails (PR-39+)

- Publish prechecks before mutation:
  - target must be `draft`
  - target version must include lesson blocks
  - quiz-required sections must have at least one question
- Publish conflicts return structured `publish_conflict` payloads with reason codes.
- Import response includes additive `validationSummary` for both `dryRun` and `apply`.
- Dry-run/apply validation reporting parity is expected for identical bundle input.

## 7) Observability + Release Hardening (PR-41)

- Every API response includes `x-request-id` (reused from inbound or generated).
- Structured JSON request logs are emitted from middleware.
- `/metrics` exposes uptime + request/auth/gating/admin conflict counters.
- Release hardening assets:
  - checklist: `/Users/poski/academy/plans/RELEASE_CHECKLIST_PR41.md`
  - smoke script: `pnpm release:smoke`
  - CI workflow: `/Users/poski/academy/.github/workflows/release-smoke.yml`

## 8) Remaining Gaps / Next-Focus Areas

- Metrics are in-memory only (reset on process restart; no persistent backend).
- Analytics ingest is intentionally unauthenticated in current phase.
- No external observability backend wiring yet (log shipping, dashboards, alerting).
