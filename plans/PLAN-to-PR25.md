# Next 20 PRs (PR-6 to PR-25) Based on `/Users/poski/academy/plans/PLAN.md`

## Summary

Current repo state is effectively at **PR-5** (content API, web player, progress API, and version-aware section reads are implemented), even though `/Users/poski/academy/README.md` still describes scope as PR-4.  
This roadmap keeps PRs small, isolated, and easy to test while moving toward the MVP plan in `/Users/poski/academy/plans/PLAN.md`.

Order chosen:
1. Finish basic learner progress UX using already-built progress endpoints.
2. Add analytics ingest and event emission early.
3. Backfill content authoring/import + publish workflow (currently missing).
4. Build quiz core, then unlock/gating, then wire it into player behavior.
5. Start XP/levels after authoritative completion + quiz pass are enforced.

## Important Public API / Type Changes (Across PR-6..PR-25)

Planned additions/changes:
- `GET /v1/progress/sections/:sectionId` (new; small read endpoint for player progress chip/resume state)
- `POST /v1/analytics/events` (new; raw ingest)
- `POST /v1/admin/content/import` (new; dry-run/apply import from local content bundle path)
- `GET /v1/admin/sections/:sectionId/versions` (new)
- `GET /v1/admin/sections/:sectionId/versions/:versionId` (new preview/detail)
- `POST /v1/admin/sections/:sectionId/publish/:versionId` (new publish workflow)
- `POST /v1/quizzes/sections/:sectionId/attempts` (new quiz submit)
- `GET /v1/quizzes/sections/:sectionId/attempts/latest` (new)
- `GET /v1/quizzes/sections/:sectionId/result` (new)
- `GET /v1/unlocks/modules/:moduleId/status` (new)
- `POST /v1/unlocks/modules/:moduleId/evaluate` (new)
- Content DTOs become lock-aware (additive fields only; preserve backward compatibility)
- `GET /v1/gamification/me` (or equivalent summary endpoint) for XP/level inspection (new, temp `x-user-id`)

Type additions (web/shared-local first):
- `SectionProgressDetail` / `GetSectionProgressResponse`
- `AnalyticsEventDto` + strict `event_name` enum
- `QuizSubmissionDto`, `QuizResultDto`, `UnlockDecisionDto`
- Lock metadata on path/module/section navigation payloads
- `GamificationSummaryDto` (XP + level only)

## PR Roadmap (20 Compact PRs)

1. **PR-6: Web Path/Module Progress Indicators (read-only wiring)**
Scope: Web-only. Add progress client methods for existing module/path progress endpoints and render simple status/progress badges on `/paths/[pathId]` and `/modules/[moduleId]`.
API/type changes: No server changes; add web types for `ModuleProgressDto` and `PathProgressDto`.
Simple test: Mark a section complete via curl, reload path/module pages, confirm percentages and completed counts change.

2. **PR-7: Section Progress Read Endpoint + Player Progress Chip**
Scope: Add `GET /v1/progress/sections/:sectionId` in API and show a small progress chip in player header (status/completion/last seen).
API/type changes: New endpoint + DTO reuse of `SectionProgressDto`.
Simple test: Start/update progress via curl, open `/learn/[sectionId]`, verify chip matches API response.

3. **PR-8: Player “Mark Complete” CTA (web integration to existing complete endpoint)**
Scope: Web-only. Add a client CTA in player footer that calls `POST /v1/progress/sections/:sectionId/complete` and updates local UI state.
API/type changes: No server changes; add web mutation helper for `complete`.
Simple test: Click CTA once and twice; confirm completed state persists and no duplicate behavior regression.

4. **PR-9: Player Position Save on Explicit Navigation Actions**
Scope: Web-only. Call `PATCH /v1/progress/sections/:sectionId/position` when user clicks next/prev section (explicit interaction only; no scroll observer yet).
API/type changes: No server changes; add web mutation helper for `position`.
Simple test: Navigate from one section to next via player buttons, inspect API row (`last_block_order`, `completion_pct`) or progress endpoint result.

5. **PR-10: Analytics Ingest Baseline (DB + Nest Module + POST endpoint)**
Scope: API-only. Add `analytics_events` table, `AnalyticsModule`, and `POST /v1/analytics/events` raw ingest.
API/type changes: New `AnalyticsEventDto` (initial permissive payload shape).
Simple test: POST a sample event and confirm row persisted with `user_id`, `section_id`, `section_version_id`, timestamps.

6. **PR-11: Analytics Validation + Idempotency + Player Event Emission (start/complete)**
Scope: API + web. Tighten event validation (`event_name` enum + payload schema), add idempotency key uniqueness, emit `section_start` and `section_complete` from existing web flows.
API/type changes: `POST /v1/analytics/events` now validates enum and accepts/uses idempotency key (header or body; choose one and document).
Simple test: Trigger player load + complete; verify rows created once, replay same request and confirm dedupe.

7. **PR-12: `packages/content-importer` Scaffold + Markdown Parser (in-memory only)**
Scope: New package only. Parse `.md/.mdx` + frontmatter into normalized draft section/version/block objects and validation messages.
API/type changes: No server changes; define importer internal types and CLI interface.
Simple test: Run importer against a sample bundle path in dry mode and inspect parsed JSON/validation output.

8. **PR-13: Importer DB Draft Upsert CLI (section_versions + lesson_blocks)**
Scope: Importer package + API Prisma access. Write parsed draft content into DB without touching published versions.
API/type changes: No HTTP changes; add CLI command contract (`--root`, `--apply`).
Simple test: Run CLI twice on same content and confirm idempotent draft updates, published rows unchanged.

9. **PR-14: Admin Content Import Endpoint (dry-run + apply)**
Scope: API-only `AdminModule`. Add `POST /v1/admin/content/import` that invokes importer for local bundle paths and returns validation/import report.
API/type changes: New endpoint; request includes bundle path + mode (`dryRun`/`apply`).
Simple test: Call dry-run and apply for a local sample bundle; verify report contents and DB changes only in apply mode.

10. **PR-15: Admin Version Listing/Preview + Publish Endpoint**
Scope: API-only. Add admin read endpoints for section versions and publish endpoint that archives prior published version, publishes target draft, preserves immutable snapshot semantics.
API/type changes: `GET /v1/admin/sections/:sectionId/versions`, `GET /v1/admin/sections/:sectionId/versions/:versionId`, `POST /v1/admin/sections/:sectionId/publish/:versionId`.
Simple test: Publish a draft version, confirm public `GET /v1/sections/:sectionId` switches for new users while pinned users remain on old version.

11. **PR-16: Quiz Schema + Seed Data + `QuizModule` Skeleton**
Scope: API + Prisma only. Add `questions`, `quiz_attempts`, `quiz_attempt_answers` tables and minimal Nest module scaffolding; seed at least one section with quiz questions.
API/type changes: No public quiz endpoints yet.
Simple test: Run migrate + seed; verify question rows exist for seeded section and tests still pass.

12. **PR-17: Quiz Submit Endpoint (MCQ Only)**
Scope: API-only quiz scoring v1. Implement `POST /v1/quizzes/sections/:sectionId/attempts` for MCQ questions with persisted attempt + per-question grading.
API/type changes: New `QuizSubmissionDto` and submit response (`score`, `maxScore`, `passed`, per-question feedback).
Simple test: Submit correct/incorrect MCQ payloads and confirm scoring + persisted attempt rows.

13. **PR-18: Short-Answer Scoring + Latest/Result Quiz Endpoints**
Scope: API-only. Add short-answer exact/regex grading, plus `GET latest` and `GET result` endpoints for gating/UI queries.
API/type changes: `GET /v1/quizzes/sections/:sectionId/attempts/latest`, `GET /v1/quizzes/sections/:sectionId/result`.
Simple test: Submit passing and failing attempts, then verify latest/result endpoints reflect latest pass state and scores.

14. **PR-19: Unlock Schema + Seed Rules + `UnlocksModule` Skeleton**
Scope: API + Prisma only. Add `unlock_rules` and `user_unlocks`, seed a simple prerequisite-based module rule.
API/type changes: No public unlock endpoints yet.
Simple test: Migrate + seed, inspect seeded rule for a module, ensure no runtime regressions.

15. **PR-20: Unlock Status Endpoint (Prerequisite Sections Evaluator, read-only)**
Scope: API-only. Implement `GET /v1/unlocks/modules/:moduleId/status` with prereq-section rule evaluation and reason payloads.
API/type changes: New `UnlockDecisionDto` (`isUnlocked`, `reasons[]`, `requiresCredits`, `creditsCost` with credits default false).
Simple test: For a user before/after completing prereq sections, confirm status payload changes and reasons are clear.

16. **PR-21: Unlock Evaluate Endpoint + Persistence + Quiz-Pass Rule Support**
Scope: API-only. Implement `POST /v1/unlocks/modules/:moduleId/evaluate` to persist `user_unlocks` when eligible; extend evaluator to support `quiz_pass`.
API/type changes: New evaluate endpoint; `UnlockDecisionDto` reused.
Simple test: User fails quiz -> evaluate denied; user passes quiz -> evaluate succeeds and `user_unlocks` row created once.

17. **PR-22: Content API Lock Metadata (Additive, User-Aware)**
Scope: API-only. Extend content path/module/section payloads with optional lock metadata when `x-user-id` is provided; preserve current responses for anonymous callers.
API/type changes: Add lock fields to path tree/module details and section navigation (additive only).
Simple test: Compare same endpoint with/without `x-user-id`; anonymous shape still works, user-aware payload includes lock status/reasons.

18. **PR-23: Web Locked States + Lock Messaging**
Scope: Web-only. Render locked badges/disabled links in path/module/player sidebar and show reason text for locked next module/section.
API/type changes: No server changes; update web content types for lock metadata.
Simple test: With seeded rule unmet, verify locked UI and disabled navigation; after unlock evaluate, verify UI updates.

19. **PR-24: Backend Completion Gating Enforcement (Quiz/Unlock Aware)**
Scope: API-only. Prevent `POST /v1/progress/sections/:sectionId/complete` from completing gated sections unless quiz pass/unlock conditions are satisfied.
API/type changes: `complete` endpoint returns structured 409/400 gating error payload (additive behavior change).
Simple test: Attempt complete before pass/unlock -> blocked; after pass/unlock -> completes and remains idempotent.

20. **PR-25: XP Events + Levels (Section Complete / Quiz Pass Awards)**
Scope: API-only gamification v1. Add `xp_events`, `user_levels`, award XP on authoritative events (section complete, quiz pass) with idempotency keys, and expose `GET /v1/gamification/me`.
API/type changes: New gamification summary endpoint (`totalXp`, `level`), temp `x-user-id`.
Simple test: Complete section and pass quiz; verify XP awards once each and summary endpoint reflects total/level.

## Test Cases and Scenarios (Cross-PR Acceptance)

1. **Learner progress baseline**
Create/start/update/complete a section, then verify path/module/player UI all reflect the same backend state.

2. **Versioning safety**
Start a section on version A, publish version B, verify pinned learner still gets A and new learner gets B.

3. **Analytics correctness**
Emit `section_start` and `section_complete`; replay same idempotency key and verify only one row per key.

4. **Import/publish workflow**
Dry-run import reports validation only, apply creates drafts, publish flips one version to published and archives previous published version.

5. **Quiz and unlock flow**
Fail quiz -> unlock denied; pass quiz -> unlock evaluate succeeds; content payload shows unlocked state for same user.

6. **Gated completion enforcement**
Attempt to complete a gated section before passing quiz returns gating error; same request succeeds after pass; repeated success stays idempotent.

7. **XP awarding**
Complete + quiz pass generate exactly-once XP events and update user level summary deterministically.

## Explicit Assumptions and Defaults

- Numbering continues from existing implemented plans, so this roadmap starts at **PR-6**.
- Keep **REST** and current **ID-based routes** through PR-25 (no slug route migration yet).
- Keep temporary `x-user-id` strategy through PR-25; auth/JWT is deferred.
- Keep progress aggregates computed on read (no cached `user_module_progress` / `user_path_progress` tables yet).
- `POST /v1/admin/content/import` will accept a **server-local bundle path** (not browser file upload) to keep PRs compact.
- Quiz pass threshold defaults to env `QUIZ_PASS_DEFAULT` with fallback `0.7`; per-quiz overrides can come later.
- Credits economy remains feature-flagged off and deferred beyond PR-25.
- Notes/bookmarks UI/API, admin learner migration endpoint, E2E browser tests, and release docs/runbook are intentionally deferred to later PRs (likely PR-26+).
