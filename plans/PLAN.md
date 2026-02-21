## HTB-Style Platform MVP Plan (4 Weeks, No Lab Infra)

### North Star
- Ship a learning platform where users progress through `Path -> Module -> Section` with clear gating and resumable progress.
- Deliver a production-lean course player UX: left nav tree, block-rendered content, continue flow, and visible progress.
- Make learning state authoritative in backend (progress, quiz pass/fail, unlocks, XP), not just frontend.
- Support versioned section content so users stay on the version they started unless explicitly migrated.
- Keep architecture modular monolith now, with bounded modules ready to split into services later.

### Architecture Recommendation
Use **Next.js + NestJS + Postgres (+ optional Redis)**.
- Reason: one TypeScript stack across frontend/backend/shared contracts reduces integration risk in first month.
- NestJS module boundaries map cleanly to future service extraction (content, progress, quiz, gamification, analytics).
- Use **REST** for MVP (faster to ship/debug than GraphQL for this scope).

---

## Week 1: Foundation + Content Model + Versioning

### Milestones
- Monorepo scaffolded.
- Auth + user skeleton in place.
- Content domain + versioning schema finalized and migrated.
- Developer-first markdown import pipeline running end-to-end for draft content.

### Tasks (priority order)
1. Initialize monorepo and app shells (`web`, `api`, `shared`), baseline tooling, CI checks.
Acceptance: `pnpm lint`, `pnpm test`, `pnpm build` run successfully in local and CI.

2. Implement backend modules: `auth`, `users`, `content` (paths/modules/sections/section_versions/lesson_blocks), with Prisma migrations.
Acceptance: Fresh DB migrate + seed creates at least 1 path, 1 module, 2 sections, and 2 section versions.

3. Define content versioning rules.
Acceptance: API can return section by `(section_id + version_id)` and “current published version”; older versions remain queryable.

4. Build markdown import CLI for v1 authoring (`.md/.mdx` + frontmatter -> section_versions + lesson_blocks JSON).
Acceptance: Running importer creates/updates draft versions without deleting published versions.

5. Add publish workflow (`draft -> published`) with immutable published snapshot.
Acceptance: Publish endpoint flips one version to published; player API resolves published version for new learners.

6. Add base analytics event ingestion endpoint/table (raw event log).
Acceptance: Completion/drop-off event POST persists with user_id, section_id, version_id, timestamp.

---

## Week 2: Course Player + Progress Engine + Gating

### Milestones
- Player UI functional with navigation tree + block rendering.
- Section progress tracking works (start, resume, position update, complete).
- Gating policy engine enforces unlock and completion rules.

### Tasks (priority order)
1. Build frontend routes/pages: dashboard, path page, module page, section player.
Acceptance: User can navigate from dashboard to player and see real content + progress indicators.

2. Implement section player layout (left tree, main content blocks, continue button, completion CTA).
Acceptance: Player loads section content/version, persists last position, and resume returns to same block anchor.

3. Implement progress backend (`user_section_progress`, aggregation jobs/queries for module/path).
Acceptance: Completing a section updates section progress immediately and module/path percentages within one request cycle.

4. Build gating/unlock policy evaluator (must-pass quiz, prerequisite sections, optional credits).
Acceptance: Locked module returns lock reason payload; unlock endpoint grants access when policy passes.

5. Add progress-related analytics events (section_start, section_complete, player_exit/drop-off).
Acceptance: Events emitted once per event type per relevant transition; duplicates deduplicated by idempotency key.

---

## Week 3: Quiz System + Gamification + Notes/Bookmarks

### Milestones
- Quiz authoring/serving/scoring implemented.
- Quiz pass gating integrated into progression.
- XP/levels and notes/bookmarks usable in player.

### Tasks (priority order)
1. Implement question models (MCQ + short-answer exact/regex for MVP), attempts, scoring service.
Acceptance: Submit attempt endpoint returns score, pass/fail, feedback per question, and persisted attempt record.

2. Wire quiz pass/fail into section completion and module unlock rules.
Acceptance: Section requiring quiz cannot be completed without passing threshold; unlock reflects latest pass state.

3. Implement XP event service and level computation (configurable thresholds).
Acceptance: Completing section and passing quiz award XP exactly once per rule; profile shows total XP + level.

4. Add optional credits economy for module unlock (feature flag).
Acceptance: If enabled, unlock endpoint checks and deducts credits atomically; if disabled, behavior unchanged.

5. Implement notes and bookmarks (CRUD) scoped to user + section + version + block anchor.
Acceptance: User can create/edit/delete notes and bookmarks; player displays saved items on reload.

6. Add analytics for quiz pass rate and question-level correctness.
Acceptance: Query/report endpoint returns per-section quiz attempts, pass %, and per-question correct %.

---

## Week 4: Admin Flows + Hardening + E2E + MVP Readiness

### Milestones
- Admin/developer content operations stable.
- Test coverage for critical policies and progress.
- Observability and release checklist complete.

### Tasks (priority order)
1. Finalize admin APIs: import, draft validate, publish, version migration mapping.
Acceptance: Admin can import draft, preview, publish, and optionally migrate in-progress users via explicit migration endpoint.

2. Add migration policy for learners on older section versions.
Acceptance: Default keeps learner on started version; admin migration endpoint can move eligible users with audit log.

3. Harden access control + idempotency on progress/quiz/unlock endpoints.
Acceptance: Replaying same request does not duplicate completions, XP, or unlock transactions.

4. Write integration tests for progress + quiz + unlock + XP flows.
Acceptance: Test suite covers happy path + fail path + retry/idempotency cases.

5. Add E2E tests for player navigation and continue flow.
Acceptance: E2E validates dashboard -> module -> section -> quiz -> unlock next module.

6. Release readiness: seed data pack, docs, runbook, and KPI dashboard query snippets.
Acceptance: New dev can bootstrap and run full MVP in <30 min using README steps.

---

## Proposed Monorepo Structure
- `/Users/poski/academy/apps/web`
- `/Users/poski/academy/apps/web/src/app` (Next.js routes)
- `/Users/poski/academy/apps/web/src/components/player`
- `/Users/poski/academy/apps/web/src/lib/api-client`
- `/Users/poski/academy/apps/api`
- `/Users/poski/academy/apps/api/src/modules/auth`
- `/Users/poski/academy/apps/api/src/modules/content`
- `/Users/poski/academy/apps/api/src/modules/progress`
- `/Users/poski/academy/apps/api/src/modules/quiz`
- `/Users/poski/academy/apps/api/src/modules/unlocks`
- `/Users/poski/academy/apps/api/src/modules/gamification`
- `/Users/poski/academy/apps/api/src/modules/notes`
- `/Users/poski/academy/apps/api/src/modules/analytics`
- `/Users/poski/academy/apps/api/src/modules/admin`
- `/Users/poski/academy/apps/api/prisma` (schema + migrations + seeds)
- `/Users/poski/academy/packages/shared` (types/contracts/zod schemas/constants)
- `/Users/poski/academy/packages/content-importer` (markdown importer CLI)
- `/Users/poski/academy/packages/config` (eslint/tsconfig/jest presets)
- `/Users/poski/academy/docs` (ADR, API specs, content authoring guide)

---

## Core Database Schema (MVP)

### Content hierarchy + versioning
- `paths`: `id`, `slug`, `title`, `description`, `status`, `sort_order`, `created_at`, `updated_at`
- `modules`: `id`, `path_id(FK paths.id)`, `slug`, `title`, `description`, `sort_order`, `status`, `credits_cost`, `created_at`, `updated_at`
- `sections`: `id`, `module_id(FK modules.id)`, `slug`, `title`, `sort_order`, `has_quiz`, `created_at`, `updated_at`
- `section_versions`: `id`, `section_id(FK sections.id)`, `version_number`, `status(draft|published|archived)`, `change_log`, `published_at`, `created_by`, `created_at`
- `lesson_blocks`: `id`, `section_version_id(FK section_versions.id)`, `block_order`, `block_type(markdown|callout|code|quiz|checklist)`, `content_json(JSONB)`, `estimated_seconds`

### Progress
- `user_section_progress`: `id`, `user_id`, `section_id`, `section_version_id`, `status(not_started|in_progress|completed)`, `started_at`, `last_seen_at`, `completed_at`, `completion_pct`, `last_block_order`, `time_spent_seconds`
- `user_module_progress`: `id`, `user_id`, `module_id`, `status`, `completed_sections`, `total_sections`, `completion_pct`, `updated_at`
- `user_path_progress`: `id`, `user_id`, `path_id`, `status`, `completed_modules`, `total_modules`, `completion_pct`, `updated_at`

### Quiz
- `questions`: `id`, `section_version_id`, `block_id(nullable if standalone quiz)`, `type(mcq|short_answer)`, `prompt`, `options_json`, `answer_key_json`, `explanation`, `points`, `sort_order`
- `quiz_attempts`: `id`, `user_id`, `section_id`, `section_version_id`, `attempt_no`, `submitted_at`, `score`, `max_score`, `passed`, `grading_details_json`
- `quiz_attempt_answers`: `id`, `attempt_id(FK quiz_attempts.id)`, `question_id`, `answer_json`, `is_correct`, `awarded_points`

### Unlocking/gating
- `unlock_rules`: `id`, `scope_type(module|section|path)`, `scope_id`, `rule_type(prereq_sections|quiz_pass|credits|min_level)`, `rule_config_json`, `is_active`, `priority`
- `user_unlocks`: `id`, `user_id`, `scope_type`, `scope_id`, `reason`, `unlocked_at`

### Gamification
- `xp_events`: `id`, `user_id`, `event_type(section_complete|quiz_pass|streak|manual)`, `source_type`, `source_id`, `xp_delta`, `idempotency_key(unique)`, `created_at`
- `user_levels`: `user_id(PK)`, `total_xp`, `level`, `updated_at`
- `badges`: `id`, `code`, `name`, `description`, `criteria_json`, `is_active`
- `user_badges`: `id`, `user_id`, `badge_id`, `awarded_at`

### Notes/bookmarks
- `notes`: `id`, `user_id`, `section_id`, `section_version_id`, `block_order`, `content_md`, `created_at`, `updated_at`
- `bookmarks`: `id`, `user_id`, `section_id`, `section_version_id`, `block_order`, `label`, `created_at`

### Analytics
- `analytics_events`: `id`, `user_id`, `event_name`, `path_id`, `module_id`, `section_id`, `section_version_id`, `payload_json`, `occurred_at`, `received_at`

---

## Minimal REST API (MVP)

### Content retrieval
- `GET /v1/paths`
- `GET /v1/paths/:pathId`
- `GET /v1/modules/:moduleId`
- `GET /v1/sections/:sectionId` (resolves version by user context)
- `GET /v1/sections/:sectionId/versions/:versionId`
- `GET /v1/sections/:sectionId/navigation` (prev/next + lock status)

### Progress
- `POST /v1/progress/sections/:sectionId/start`
- `PATCH /v1/progress/sections/:sectionId/position` (`last_block_order`, `time_spent_delta`)
- `POST /v1/progress/sections/:sectionId/complete`
- `GET /v1/progress/modules/:moduleId`
- `GET /v1/progress/paths/:pathId`

### Quiz
- `POST /v1/quizzes/sections/:sectionId/attempts` (submit answers, evaluate)
- `GET /v1/quizzes/sections/:sectionId/attempts/latest`
- `GET /v1/quizzes/sections/:sectionId/result` (pass state for gating)

### Unlocking
- `GET /v1/unlocks/modules/:moduleId/status`
- `POST /v1/unlocks/modules/:moduleId/evaluate`
- `POST /v1/unlocks/modules/:moduleId/redeem-credits` (optional feature flag)

### Notes/bookmarks
- `GET /v1/notes?sectionId=...`
- `POST /v1/notes`
- `PATCH /v1/notes/:noteId`
- `DELETE /v1/notes/:noteId`
- `GET /v1/bookmarks?sectionId=...`
- `POST /v1/bookmarks`
- `DELETE /v1/bookmarks/:bookmarkId`

### Admin/content
- `POST /v1/admin/content/import` (markdown bundle -> draft versions)
- `POST /v1/admin/sections/:sectionId/publish/:versionId`
- `POST /v1/admin/sections/:sectionId/migrate-users` (optional controlled migration)
- `GET /v1/admin/content/validation-report/:importJobId`

### Analytics ingest/report
- `POST /v1/analytics/events`
- `GET /v1/admin/analytics/quiz-pass-rate?sectionId=...`
- `GET /v1/admin/analytics/dropoff?moduleId=...`

---

## Frontend Routes/Pages (MVP)
- `/dashboard`: enrolled paths, continue-learning card, XP/level summary, recent bookmarks.
- `/paths/[pathSlug]`: path overview, module list with locked/unlocked state, progress bar per module.
- `/modules/[moduleSlug]`: module overview, section list with statuses (not started/in progress/completed/locked), prerequisites hints.
- `/learn/[sectionSlug]` (section player): left tree nav (path/module/sections), current section content blocks, quiz block rendering, continue/next CTA, progress chip, notes panel, bookmarks panel, lock messaging for next section/module.

---

## Important API/Type Contracts (Public Interfaces)
- `ContentTreeDto`: normalized path/module/section tree + lock metadata.
- `SectionPayloadDto`: resolved `section_version_id`, blocks, quiz metadata, navigation links.
- `ProgressUpdateDto`: `section_id`, `section_version_id`, `status`, `last_block_order`, `completion_pct`.
- `QuizSubmissionDto`: answers keyed by `question_id`; response includes `passed`, `score`, `feedback`.
- `UnlockDecisionDto`: `is_unlocked`, `reasons[]`, `requires_credits`, `credits_cost`.
- `AnalyticsEventDto`: strict enum `event_name` with validated payload schema.

---

## Plan Hygiene

### Build order to avoid rework
1. Lock content/versioning schema first.
2. Implement progress state machine second.
3. Add gating policy engine before finalizing player “complete/continue” UX.
4. Add quiz evaluation once gating contracts are stable.
5. Add XP/credits as listeners on authoritative domain events (not direct UI triggers).
6. Add admin publish/migration only after versioned player flow is proven.

### Risks and mitigations
- Version drift risk: user starts one version, content updates later.
Mitigation: persist `section_version_id` at start and always resolve by progress context first.
- Duplicate rewards/completions from retries.
Mitigation: idempotency keys + DB unique constraints on completion/XP events.
- Gating edge cases (partial quiz, changed pass threshold).
Mitigation: store pass threshold snapshot per attempt; evaluate unlock against attempt record, not mutable config alone.
- Aggregation inconsistency.
Mitigation: transactionally update section progress and queue module/path recompute in same request cycle (or synchronous query for MVP).
- Authoring quality issues from markdown import.
Mitigation: validation report with hard errors (invalid block type) and warnings (missing estimated time).

### Testing strategy
- Unit tests: unlock policy evaluator, quiz scorer, XP award rules, level threshold calculator.
- Integration tests: section start/resume/complete flow, quiz submit->pass gating, unlock decision with credits, idempotent retries.
- E2E tests: dashboard continue flow, player navigation tree state, quiz gate unlocking next section/module.
- Contract tests: shared DTO schemas between Next.js client and NestJS API.

---

## Day 0 Setup Checklist

### Commands
1. `pnpm init`
2. `pnpm dlx create-turbo@latest` (or manual workspace init)
3. `pnpm add -D typescript eslint prettier turbo`
4. `pnpm --filter api add @nestjs/common @nestjs/core @nestjs/platform-express prisma @prisma/client zod`
5. `pnpm --filter web add next react react-dom zod`
6. `pnpm --filter api dlx prisma init`
7. `pnpm db:migrate` (script -> `prisma migrate dev`)
8. `pnpm dev` (runs web + api concurrently)

### Env vars (minimum)
- `DATABASE_URL`
- `REDIS_URL` (optional)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `NEXT_PUBLIC_API_BASE_URL`
- `ANALYTICS_WRITE_KEY` (optional for external sink)
- `CONTENT_IMPORT_ROOT` (path for markdown bundles)
- `FEATURE_CREDITS_ENABLED` (`true|false`)
- `QUIZ_PASS_DEFAULT` (e.g., `0.7`)

### Migration tool choice
- **Prisma Migrate** for speed in MVP and strong TS ergonomics; revisit raw SQL migrations only if needed for advanced tuning.

---

## Assumptions and Defaults
- Single-tenant platform for MVP.
- Email/password or simple JWT auth already acceptable for first month.
- English-only content initially.
- Quiz types in MVP limited to MCQ + short-answer exact/regex grading.
- “Continue” resumes last in-progress section by `last_seen_at`.
- Credits system off by default via feature flag.
- Redis optional and only introduced for caching/rate limiting if needed after Week 2 metrics.
