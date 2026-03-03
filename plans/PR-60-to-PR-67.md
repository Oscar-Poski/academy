## PR-60+ Plan: Modern SaaS UI Rollout (Public Landing + Public Courses + Optional Login)

### Summary
Build the next UI phase as a sequence of small, decoupled PRs to satisfy your requirements:

1. Modern SaaS academy look  
2. Public main page with hero  
3. Public visibility of available courses  
4. Login optional (header CTA)  
5. Black background, white text, yellow highlights

### Locked Product Decisions (from your answers)
- `/` will be a **single public landing** for everyone (logged in users can still see personalized blocks there).
- Add a dedicated public catalog route: **`/courses`**.

---

## PR-60 — Public Home Baseline + Safe Session Read in Layout
### Goal
Make `/` publicly accessible and remove session-related SSR breakage in read-only rendering contexts.

### Changes
- Update middleware matcher to protect only learner-protected routes (`/learn/:path*`), not `/`.
- Remove strict auth guard from home page loader (`requireAuthSession('/')`).
- Introduce a **read-only session profile resolver** for layout/home usage:
  - Never mutates cookies in server component render path.
  - If tokens are invalid, returns unauthenticated state safely.
- Keep strict protected-route guard for `/learn/:sectionId` unchanged.
- Header continues showing login/signup or user/logout based on resolved session.

### Files (expected)
- `apps/web/middleware.ts`
- `apps/web/app/page.tsx`
- `apps/web/src/lib/auth/get-session-profile.server.ts` (refactor split: mutable vs read-only paths)
- `apps/web/src/components/auth/AppHeader.tsx` (if resolver wiring changes)

### Tests
- Middleware regression: `/` allowed anonymous, `/learn/*` still redirected without session.
- Session resolver tests: invalid token in layout context does not throw and does not attempt cookie writes.
- Home page test: anonymous render succeeds.

### Acceptance
- Anonymous user can open `http://localhost:3000/`.
- No “Cookies can only be modified…” runtime error from layout/home rendering.

---

## PR-61 — Visual Theme Foundation v2 (Black/White/Yellow SaaS)
### Goal
Shift the current visual baseline to your desired brand direction without changing behavior.

### Changes
- Add/adjust design tokens in `globals.css`:
  - Canvas: true near-black
  - Text: high-contrast white/off-white
  - Accent/highlight: yellow scale
  - Supporting neutrals for borders/surfaces
- Update shared shell surfaces (header/footer/buttons/links/cards) to use yellow highlights.
- Keep existing class contracts to avoid component churn.

### Files (expected)
- `apps/web/app/globals.css`
- Optional token contract tests in `apps/web/src/lib/styles/*`

### Tests
- Style contract tests assert required yellow-accent semantic tokens/selectors exist.
- Existing UI tests should remain behaviorally unchanged.

### Acceptance
- Global shell clearly reflects black/white/yellow palette.
- No route/API changes.

---

## PR-62 — Public Courses Index Route (`/courses`)
### Goal
Make “available courses” explicitly discoverable for anonymous users.

### Changes
- Add route `GET /courses`.
- Server-load `getPaths()` publicly.
- Render catalog grid of available paths/modules with clear CTAs:
  - “View path” -> `/paths/:pathId`
- Add empty/fallback state if catalog unavailable.
- Keep auth optional; no gating.

### Files (expected)
- `apps/web/app/courses/page.tsx` (new)
- `apps/web/app/courses/loading.tsx` (new)
- `apps/web/src/components/catalog/*` (small reuse/extension)

### Tests
- `/courses` renders for anonymous users.
- Displays path cards from mocked API response.
- Handles empty catalog gracefully.

### Acceptance
- Anyone can browse course catalog at `/courses`.

---

## PR-63 — Public Hero Landing (`/`) with Course Preview
### Goal
Turn home into a real marketing + discovery page while preserving logged-in utility.

### Changes
- Replace scaffold home with:
  - Hero headline/subheadline
  - Primary CTA: `Explorar cursos` -> `/courses`
  - Secondary CTA: `Iniciar sesión` (and/or `Crear cuenta`)
- Add “Featured courses” preview section (first N paths from `getPaths()`).
- If authenticated, keep/add compact personalized strip (continue learning) below hero; do not redirect away.
- Remove technical scaffold copy (“Monorepo scaffold is running”).

### Files (expected)
- `apps/web/app/page.tsx`
- `apps/web/src/lib/onboarding/*` (reuse for logged-in strip if needed)
- `apps/web/app/globals.css` (landing sections)

### Tests
- Anonymous: hero + CTAs + preview render.
- Authenticated: hero remains public + personalized continue block renders when data exists.
- Fallback states remain non-fatal.

### Acceptance
- `/` is a polished public landing for both anonymous and logged-in users.

---

## PR-64 — Header/Nav UX: Optional Login + Public IA Links
### Goal
Make navigation explicit and frictionless.

### Changes
- Header primary links:
  - `Inicio` -> `/`
  - `Cursos` -> `/courses`
- Auth controls:
  - Anonymous: `Iniciar sesión`, `Crear cuenta`
  - Authenticated: email + `Cerrar sesión`
- Keep mobile menu behavior and focus semantics from prior a11y work.
- Footer mirrors primary IA minimally.

### Files (expected)
- `apps/web/src/components/auth/AppHeaderClient.tsx`
- `apps/web/src/components/shell/AppFooter.tsx`
- `apps/web/src/lib/copy/microcopy.ts`

### Tests
- Header client tests for anonymous/authenticated states and active link behavior.
- Footer tests for anonymous/authenticated link sets.
- Keyboard/focus behavior regression tests for mobile nav.

### Acceptance
- Login is clearly optional and always visible in header.
- Public navigation to courses is always present.

---

## PR-65 — Public Catalog Page Polish (`/paths/:pathId`, `/modules/:moduleId`)
### Goal
Ensure course details feel premium and clear to anonymous users.

### Changes
- Improve information hierarchy and CTA consistency on public detail pages.
- Ensure lock/progress messaging degrades cleanly for anonymous users:
  - Show course structure without requiring login.
  - Use neutral prompts for gated actions (e.g., “Inicia sesión para guardar progreso” where relevant).
- Keep existing data contracts and route behavior.

### Files (expected)
- `apps/web/app/paths/[pathId]/page.tsx`
- `apps/web/app/modules/[moduleId]/page.tsx`
- `apps/web/src/components/catalog/*`
- `apps/web/src/lib/copy/microcopy.ts`

### Tests
- Anonymous rendering of path/module pages with clear actions.
- Non-fatal progress-unavailable notices remain consistent.
- No regressions in locked-state rendering.

### Acceptance
- Anyone can inspect available course structure and next steps without authentication.

---

## PR-66 — SaaS Polish Pass (Spacing, Typography, Motion, Responsive)
### Goal
Finalize modern SaaS feel without changing product logic.

### Changes
- Typography scale tuning for hero/catalog readability.
- Stronger section rhythm (container widths, vertical spacing).
- Subtle motion for hero/cards (respect reduced motion).
- Mobile refinements for landing + courses cards + nav.

### Files (expected)
- `apps/web/app/globals.css`
- Small class updates in landing/catalog components

### Tests
- Style contract tests for critical selectors/breakpoints.
- Existing component/page tests remain green.

### Acceptance
- UI feels cohesive and modern across desktop/mobile in black/yellow theme.

---

## PR-67 — Regression Hardening for Public Journey
### Goal
Lock the new public UX as a required quality bar.

### Changes
- Add/expand regression tests for journey:
  - anonymous `/` -> `/courses` -> `/paths/:id` -> `/modules/:id`
  - header login CTA visibility in all public pages
  - authenticated user still sees optional personalized elements on `/`
- Include new tests in `test:regression` matrix if missing.

### Files (expected)
- `apps/web/src/lib/regression/mvp-flow-contract.test.ts` (extend)
- `apps/web/app/courses/page.test.tsx` (new)
- `apps/web/src/components/auth/AppHeaderClient.test.tsx` (extend)
- `apps/web/package.json` regression script update (if needed)

### Acceptance
- Public discovery + optional-login experience is protected by CI regression gate.

---

## Public Interfaces / Contracts
- No backend API contract changes.
- New public web route:
  - `GET /courses`
- Existing protected behavior remains:
  - `/learn/:sectionId` still requires valid authenticated session.

---

## Cross-PR Test Strategy
For each PR:
1. Targeted tests for touched pages/components.
2. `pnpm --filter @academy/web test`
3. `pnpm --filter @academy/web typecheck`
4. `pnpm --filter @academy/web test:regression`

---

## Assumptions and Defaults
- Keep Spanish (es-MX) as current UI language baseline.
- Content titles/descriptions remain source-of-truth from API (not rewritten in these PRs).
- No new backend endpoints are required for this phase.
- Auth remains optional for browsing; required only for progress/learn actions.
