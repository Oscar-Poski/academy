# Academy App Summary (Admin View)

As of February 27, 2026, this app is a learning platform MVP with a Next.js web app (`apps/web`) and NestJS API (`apps/api`) backed by PostgreSQL/Prisma.

## 1) What The App Can Do Today

- Serve learning content in a Path -> Module -> Section structure.
- Track learner progress per section/module/path.
- Enforce section completion gating (quiz pass + unlock rules).
- Ingest analytics events with idempotency support.
- Accept quiz attempts and score MCQ + short-answer questions.
- Evaluate and persist module unlock decisions.
- Award XP and compute user level from learning actions.
- Import content bundles and manage section version publishing via admin APIs.

## 2) Basic Workflows

### Learner workflow (web)

1. Home page calls `/health` and `/v1/progress/continue` to show system status + “Continue learning”.
2. Learner opens `/paths/:pathId` then `/modules/:moduleId` then `/learn/:sectionId`.
3. Opening a section starts progress (`POST /v1/progress/sections/:sectionId/start`) and emits a best-effort `section_start` analytics event.
4. Prev/Next navigation performs a best-effort checkpoint save (`PATCH /v1/progress/sections/:sectionId/position`) before route change.
5. “Mark Complete” calls `POST /v1/progress/sections/:sectionId/complete` and emits best-effort `section_complete` analytics.
6. Content lock metadata (when user context is known) disables locked module/section navigation and shows reasons.

### Quiz workflow (API)

1. Client submits answers to `POST /v1/quizzes/sections/:sectionId/attempts`.
2. API resolves correct section version (pinned version if user progress exists; otherwise latest published).
3. API grades MCQ + short-answer (exact/exact_ci/regex), stores attempt + per-question answers.
4. If passing, API awards quiz XP idempotently.
5. Clients can read latest attempt/result via:
   - `GET /v1/quizzes/sections/:sectionId/attempts/latest`
   - `GET /v1/quizzes/sections/:sectionId/result`

### Unlock workflow (API)

1. Read current module lock state: `GET /v1/unlocks/modules/:moduleId/status`.
2. Evaluate/persist unlock: `POST /v1/unlocks/modules/:moduleId/evaluate`.
3. Rules currently evaluated: `prereq_sections`, `quiz_pass` (others are in enum but not implemented in evaluator).

### Admin content workflow (API)

1. Dry-run import bundle: `POST /v1/admin/content/import` with `mode: "dryRun"`.
2. Apply import bundle: same endpoint with `mode: "apply"`.
3. Review section versions:
   - `GET /v1/admin/sections/:sectionId/versions`
   - `GET /v1/admin/sections/:sectionId/versions/:versionId`
4. Publish draft version: `POST /v1/admin/sections/:sectionId/publish/:versionId`.
5. Publishing archives previously published versions and preserves pinned users on older archived versions.

## 3) API Functionality Map

### System

- `GET /health`: API + DB health check.

### Content

- `GET /v1/paths`: list paths.
- `GET /v1/paths/:pathId`: path tree (optional user-aware lock metadata via `x-user-id`).
- `GET /v1/modules/:moduleId`: module detail (optional user-aware lock metadata via `x-user-id`).
- `GET /v1/sections/:sectionId`: section content + navigation; resolves pinned or latest published section version.

### Progress (`x-user-id` required)

- `POST /v1/progress/sections/:sectionId/start`
- `PATCH /v1/progress/sections/:sectionId/position`
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/sections/:sectionId`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`
- `GET /v1/progress/continue`

### Quiz (`x-user-id` required)

- `POST /v1/quizzes/sections/:sectionId/attempts`
- `GET /v1/quizzes/sections/:sectionId/attempts/latest`
- `GET /v1/quizzes/sections/:sectionId/result`

### Unlocks (`x-user-id` required)

- `GET /v1/unlocks/modules/:moduleId/status`
- `POST /v1/unlocks/modules/:moduleId/evaluate`

### Gamification (`x-user-id` required)

- `GET /v1/gamification/me`

### Analytics

- `POST /v1/analytics/events`
- Allowed `event_name`: `section_start`, `section_complete`, `player_exit`, `player_dropoff`.

### Admin

- `POST /v1/admin/content/import`
- `GET /v1/admin/sections/:sectionId/versions`
- `GET /v1/admin/sections/:sectionId/versions/:versionId`
- `POST /v1/admin/sections/:sectionId/publish/:versionId`

## 4) Database Tables That Exist

Prisma models map to these PostgreSQL tables:

- `users`: learner identities.
- `paths`: top-level learning paths.
- `modules`: modules under a path.
- `sections`: sections under a module.
- `section_versions`: draft/published/archived section versions.
- `lesson_blocks`: ordered content blocks for a section version.
- `questions`: quiz questions for a section version.
- `quiz_attempts`: per-user quiz attempt headers and scores.
- `quiz_attempt_answers`: per-question answers per attempt.
- `user_section_progress`: per-user progress/pinning for sections.
- `analytics_events`: raw analytics ingestion store.
- `unlock_rules`: configured unlock logic per scope.
- `user_unlocks`: persisted unlock grants per user/scope.
- `xp_events`: XP award ledger with idempotency key.
- `user_levels`: aggregate XP and current level per user.

## 5) Regular User vs Admin Capabilities

### Regular user (implemented)

- Browse paths/modules/sections in web UI.
- Start, continue, checkpoint, and complete sections.
- See progress summaries on path/module/player pages.
- Be blocked by unlock/quiz gating when appropriate.
- Trigger analytics events via player actions.
- Use quiz/unlock/gamification endpoints directly via API.

### Admin (implemented)

- Import content bundles (dry-run/apply) through admin API.
- Inspect section versions and preview lesson blocks.
- Publish draft versions and archive previous published versions.

### Current role/auth reality

- There is currently no full auth/RBAC layer yet.
- “Admin” is functionally represented by `/v1/admin/*` endpoints, not enforced roles/permissions.
- User-scoped endpoints currently depend on `x-user-id` (temporary strategy).

## 6) Notable Limitations / Gaps

- Web UI has quiz block placeholders; full interactive quiz UI is not implemented yet.
- Credits/min-level unlock rule types exist in schema enums but are not fully evaluated/redeemed in current unlock logic.
- No credits wallet or credits-redemption API yet.
- Production auth/session model is pending (temporary env/header-based user context in place).
