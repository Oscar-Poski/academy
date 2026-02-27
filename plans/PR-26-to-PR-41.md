# Academy Roadmap: Tiny, Testable PR Plan (Auth/RBAC First)

## Summary
This plan sequences work into compact PRs (tiny scope, strict merge gates) to harden security first, then unlock learner value (quiz UX), then complete unlock economics and admin/reporting.  
Default cadence: each PR should be independently releasable, backward-compatible where possible, and include unit/integration plus at least one end-to-end assertion.

## Locked decisions for this plan
- Priority stream: Auth/RBAC first.
- PR size target: Tiny (~150–300 LOC net and 1–2 focused tests, excluding fixtures).
- Merge gate: Strict (unit/integration + at least one E2E behavior assertion).
- Auth model: JWT access token (`Authorization: Bearer`) + refresh token endpoint.
- Role model: `user` and `admin` roles enforced on API routes.
- Compatibility: temporary bridge support for `x-user-id` during migration, then removal.

## Public API / interface changes (planned)
- Add `POST /v1/auth/login`, `POST /v1/auth/refresh`, `POST /v1/auth/logout`, `GET /v1/auth/me`.
- Add role-aware access control to `/v1/admin/*`.
- Migrate user-scoped endpoints from `x-user-id` to authenticated principal.
- Keep content read endpoints public; optional auth context enriches lock metadata.
- Add quiz read endpoint for question payloads (without answers), e.g. `GET /v1/quizzes/sections/:sectionId`.
- Add credits endpoints (balance + redemption) to complete unlock economics.
- Deprecate then remove `x-user-id` contract after migration PRs.

## PR-by-PR implementation plan

1. PR-26: Auth schema foundation  
Scope: Add DB fields for auth and role (`password_hash`, `role`, refresh token metadata table or hashed refresh token fields). Seed one admin and one learner.  
Tests: Prisma migration test, seed smoke test, E2E user lookup by role.  
Done when: Schema is migrated and seeded deterministically in dev/test.

2. PR-27: Auth module MVP (login/me)  
Scope: Implement JWT issuance and `GET /v1/auth/me`; add password verification; add shared auth DTOs and error shapes.  
Tests: Unit tests for token service/password verify; E2E login success/failure and `auth/me`.  
Done when: Valid login returns token and `auth/me` resolves principal.

3. PR-28: Refresh/logout and token lifecycle  
Scope: Implement refresh token rotation and logout invalidation (hashed refresh token persistence).  
Tests: E2E refresh success, refresh replay rejection, logout invalidates next refresh.  
Done when: Refresh lifecycle is one-time-use and logout is effective.

4. PR-29: Guarded user context bridge  
Scope: Introduce auth guard that sets request user principal; user-scoped services consume principal first, fall back to `x-user-id` for compatibility.  
Tests: E2E for progress/quiz/unlock/gamification via bearer token; regression E2E for temporary `x-user-id` path.  
Done when: Both auth and legacy paths work; principal is canonical internally.

5. PR-30: Admin RBAC enforcement  
Scope: Add roles guard/decorator and enforce `admin` on `/v1/admin/*`; return standardized `403`.  
Tests: E2E admin allowed, learner denied across all admin endpoints.  
Done when: No admin endpoint is callable without admin role.

6. PR-31: Web auth plumbing (minimal)  
Scope: Add sign-in flow in web app, session/token storage strategy for server/client calls, update API clients to send bearer token.  
Tests: Web integration test for login + protected call; E2E “continue learning” with authenticated user.  
Done when: Web no longer depends on `NEXT_PUBLIC_TEMP_USER_ID` for core learner routes.

7. PR-32: Remove legacy `x-user-id` usage  
Scope: Remove fallback from API controllers/services and web clients; keep one compatibility note in changelog/docs.  
Tests: E2E negative tests proving `x-user-id` is ignored/rejected where appropriate.  
Done when: Auth principal is the only source of user identity.

8. PR-33: Quiz delivery endpoint (read model)  
Scope: Add safe quiz read endpoint returning questions/options only (no answer keys), aligned to pinned/latest version semantics.  
Tests: E2E ensures answer keys never leak and ordering is deterministic.  
Done when: Web can render real quiz inputs from API.

9. PR-34: Quiz UI v1 (interactive)  
Scope: Replace placeholder block with question rendering, answer submission, attempt result display, retry CTA.  
Tests: Component tests for rendering/state transitions; E2E complete a quiz and view pass/fail.  
Done when: Learner can attempt quizzes end-to-end from `/learn/:sectionId`.

10. PR-35: Completion gating UX feedback  
Scope: Surface `completion_blocked` reasons cleanly in player UI; link blocked state to quiz/unlock actions.  
Tests: E2E for blocked completion and unblock path after passing quiz/evaluating unlock.  
Done when: No silent failure on completion gating.

11. PR-36: Credits data model + wallet API  
Scope: Implement credits ledger/balance model and `GET /v1/credits/me` (or equivalent).  
Tests: Unit tests for balance computation, E2E balance endpoint auth + correctness.  
Done when: Credits balance is authoritative and queryable per user.

12. PR-37: Credits redemption in unlock flow  
Scope: Add redemption endpoint/operation and integrate with unlock evaluation for credit-gated modules.  
Tests: E2E for insufficient credits, successful redemption, idempotency/replay protection.  
Done when: Credit-gated modules can be unlocked via explicit redemption path.

13. PR-38: `min_level` unlock rule support  
Scope: Implement evaluator branch for `min_level` using `user_levels`; include deterministic unmet reason strings.  
Tests: Unit evaluator tests + E2E unlock status/evaluate with varying levels.  
Done when: `min_level` rules behave like existing prereq/quiz rules.

14. PR-39: Admin safety rails for publish/import  
Scope: Add publish prechecks, clearer conflict errors, and import validation reporting improvements.  
Tests: E2E publish conflict scenarios and dry-run/apply parity assertions.  
Done when: Admin workflows fail predictably with actionable errors.

15. PR-40: Analytics quality + funnel events  
Scope: Add missing player lifecycle events (`player_exit`, `player_dropoff`) from web flow and enforce payload shape contracts.  
Tests: E2E event emission for key journey steps; API validation tests for payload contracts/idempotency.  
Done when: Core learning funnel is fully instrumented and query-consistent.

16. PR-41: Observability and release hardening  
Scope: Add structured request logs, auth failure metrics, and a release checklist for migrations/rollback.  
Tests: Integration tests for log/metric hooks on auth and gating failures; smoke checklist in CI.  
Done when: Operational signals exist for auth, quiz, unlock, and admin actions.

## Test scenarios that must exist by the end
- Auth happy/sad paths: login, refresh rotate, logout, unauthorized access.
- RBAC: learner blocked from all admin endpoints.
- Progress and completion: authenticated only, quiz/unlock gating enforced with clear reasons.
- Quiz: no answer-key leakage in read endpoints; scoring correctness for MCQ/short-answer.
- Unlocks: prereq, quiz_pass, credits, min_level rule evaluation and persistence.
- Gamification: XP idempotency on section completion and quiz pass.
- Admin content lifecycle: import dry-run/apply and publish/archive behavior with pinned-version safety.
- Web learner journey: login -> continue -> learn -> quiz -> complete section.

## Rollout and compatibility strategy
- PR-26..PR-30 ship backend auth and RBAC with temporary identity bridge.
- PR-31 migrates web to auth tokens.
- PR-32 removes legacy identity path.
- Remaining PRs build on authenticated principal only.
- Each PR includes explicit rollback notes (migration rollback or feature-flag fallback where applicable).

## Assumptions and defaults
- Single API deployment; no external identity provider in this phase.
- JWT secrets and token TTLs are environment-managed.
- Existing seeded user remains for local/dev bootstrapping.
- No mobile client contract to preserve yet (web + API only).
- Content endpoints remain publicly readable unless explicitly changed in a future security pass.
