## PR-42+ Sequence: Auth Journey Completion + UI Foundations

### Summary
This sequence is optimized for your MVP target first, then UX quality:  
`create account -> login -> start module -> logout -> login again -> continue learning`.

The plan is intentionally split into small, independently testable PRs with strict boundaries.  
Auth journey PRs land first (PR-42 to PR-48). UI foundation PRs then harden experience without blocking core auth flow (PR-49 to PR-58).

### Sequencing Rules (applies to every PR)
- Each PR is releasable on its own.
- No PR mixes backend auth contract changes with broad UI restyling.
- Each PR includes at least one focused test file update and one acceptance scenario.
- Keep existing API contracts stable unless explicitly listed below.

### Public API / Interface Additions Across This Sequence
- New API endpoint: `POST /v1/auth/register`
- New web page: `GET /signup`
- New web BFF route: `POST /api/auth/register`
- Optional web route for guarded session check: `GET /api/auth/session` (internal web use only; no backend API change)

---

## Auth Journey Track (MVP-Critical)

### PR-42: Register API MVP
- Goal: add self-serve account creation in API.
- Scope: `apps/api/src/modules/auth` add `register` DTO/service/controller path; bcrypt hash at creation; role default `user`.
- Public contract:
  - `POST /v1/auth/register` body `{ email, password, name }`
  - `201` success returns same token pair shape as login.
  - `409` for duplicate email: `{ code: "email_in_use", message: "Email already registered" }`
  - validation failure returns `400`.
- Tests:
  - unit: register validation + duplicate handling + hash persisted.
  - e2e: register success, duplicate email 409, created user can call `/v1/auth/me` with returned token.
- Decoupling: API-only PR, no web changes.

### PR-43: Web Signup Route + Form
- Goal: expose registration in web app.
- Scope: add `/signup` page, signup form component, `/api/auth/register` route proxy to API, cookie set on success.
- Public interface:
  - `GET /signup`
  - `POST /api/auth/register`
- Tests:
  - route tests for proxy success/failure.
  - component tests for form validation/render error/success redirect.
- Decoupling: web-only on top of PR-42 endpoint.

### PR-44: Auth Navigation Shell (Login/Signup/Logout State)
- Goal: make auth state visible and operable from all key pages.
- Scope: add lightweight app header in `app/layout.tsx`; show login/signup links when anonymous; show user email + logout when authenticated.
- Public interface: no backend changes.
- Tests:
  - header rendering tests for anonymous vs authenticated.
  - logout flow test clears cookies and redirects.
- Decoupling: presentation + existing `/api/auth/me`/`/api/auth/logout`.

### PR-45: Session Guard Hardening for Protected Routes
- Goal: avoid “cookie exists but invalid session” false-positives.
- Scope: introduce server-side session verification helper used by middleware or protected page loaders; one refresh attempt before redirect.
- Public interface:
  - optional `GET /api/auth/session` internal route returning `{ authenticated: boolean, user?: ... }`.
- Tests:
  - middleware/session tests for valid token, expired access + valid refresh, invalid refresh.
- Decoupling: no domain logic changes, only session correctness.

### PR-46: New Learner Onboarding State
- Goal: first-time user can start learning immediately after signup/login.
- Scope: home page branch for “no progress yet” with deterministic CTA to first unlocked path/module/section.
- Public interface: no backend contract change.
- Tests:
  - server-page tests for no-progress state vs continue-learning state.
- Decoupling: web rendering only.

### PR-47: Auth Journey E2E Pack (API + Web)
- Goal: lock the MVP flow with regression coverage.
- Scope: add end-to-end scenario tests.
- Required scenarios:
  - register new account -> lands authenticated.
  - start a module/section -> progress row exists.
  - logout -> protected route redirects to `/login`.
  - login again -> continue state resumes same section/module context.
- Decoupling: test-only PR.

### PR-48: Auth Abuse Protections (Minimal)
- Goal: stabilize login/register in real usage.
- Scope: lightweight rate limiting on auth endpoints + basic password policy checks.
- Public contract:
  - `429` shape for rate-limited requests.
  - password policy `400` shape for weak passwords.
- Tests:
  - unit/e2e for rate-limit and policy branches.
- Decoupling: backend auth hardening only.

---

## UI Foundations Track (Post-MVP Loop, still small PRs)

### PR-49: Design Tokens + Theme Baseline
- Goal: establish maintainable visual primitives.
- Scope: replace ad-hoc globals with tokenized color/spacing/type scale in `globals.css`.
- Public interface: none.
- Tests: snapshot or DOM style assertion for token application in key components.

### PR-50: Reusable UI Primitives
- Goal: reduce duplicated styles and inconsistent interactions.
- Scope: add small component set (`Button`, `Input`, `Card`, `Badge`, `Alert`) in `apps/web/src/components/ui`.
- Public interface: internal component API only.
- Tests: component tests for variants/states/accessibility attrs.

### PR-51: Auth Pages UX Polish
- Goal: improve conversion and clarity for login/signup.
- Scope: refactor `/login` and `/signup` to use UI primitives, inline validation, clear error messaging.
- Public interface: none.
- Tests: form behavior tests, keyboard submit/focus flow.

### PR-52: Global App Shell + Responsive Nav
- Goal: consistent top-level UX and mobile usability.
- Scope: responsive header/nav/footer shell applied across home/path/module/learn.
- Public interface: none.
- Tests: rendering tests at mobile/desktop breakpoints (component-level).

### PR-53: Paths/Modules Information Architecture Refresh
- Goal: improve discoverability and actionability.
- Scope: redesign list cards, progress chips, locked-state presentation, primary CTA hierarchy.
- Public interface: none.
- Tests: page/component tests for lock/progress states rendering.

### PR-54: Learn Player Readability and Action Layout
- Goal: reduce friction in lesson consumption.
- Scope: improve typography rhythm, content width, sticky action/footer behavior, section metadata clarity.
- Public interface: none.
- Tests: player component tests for layout states and action availability.

### PR-55: Loading, Empty, and Error State System
- Goal: eliminate abrupt/generic fallback UX.
- Scope: standardized skeletons and recoverable error surfaces for auth/content/progress/quiz calls.
- Public interface: none.
- Tests: route/component tests for all fallback branches.

### PR-56: Accessibility Pass (A11y)
- Goal: meet practical baseline for keyboard and screen-reader use.
- Scope: focus management, landmarks, labels, contrast fixes, aria-live for async actions.
- Public interface: none.
- Tests: testing-library a11y assertions, keyboard navigation flows.

### PR-57: Microcopy and UX Consistency
- Goal: unify wording and reduce learner confusion.
- Scope: normalize labels/messages for auth, quiz, completion blocked, unlock, and errors.
- Public interface: none.
- Tests: targeted assertions for critical user-facing messages.

### PR-58: UI Regression Guardrail Pack
- Goal: prevent visual and interaction regressions as features continue.
- Scope: expand component/integration regression suite for login/signup/home/path/module/learn/quiz/footer actions.
- Public interface: none.
- Tests: consolidated web test matrix + typecheck gate updates.

---

## Test Cases and Scenarios (Must Exist by End of PR-58)
- Auth creation and session:
  - successful register creates user and authenticated session.
  - duplicate email returns deterministic `409 email_in_use`.
  - logout clears session; re-login restores access.
- Learner journey:
  - first-login user can start first module/section without manual ID setup.
  - resumed login returns to meaningful continue-learning state.
- Protected route behavior:
  - anonymous users redirected from `/` and `/learn/*`.
  - invalid/expired sessions handled with refresh-once then redirect.
- UI quality:
  - consistent button/input/card states.
  - lock/progress/quiz/completion states readable on mobile and desktop.
  - keyboard and focus flows work for auth and learn core actions.

## Assumptions and Defaults
- No email verification in this MVP sequence.
- Registration auto-signs-in user by returning token pair and setting cookies.
- Password reset/recovery is deferred beyond PR-58.
- Existing API auth model (JWT + refresh rotation) remains unchanged.
- UI changes preserve current backend contracts; no schema migrations are required for UI foundation PRs.

