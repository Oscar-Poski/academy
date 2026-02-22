# PR-8 Plan: Player “Mark Complete” CTA (Web Integration to Existing Progress Complete Endpoint)

## Summary

PR-8 adds a clickable “Mark Complete” action to the player footer on `/learn/[sectionId]`, wired to the existing backend endpoint `POST /v1/progress/sections/:sectionId/complete`.

Goals:
- Let users mark the current section complete from the player UI.
- Update CTA local state immediately (pending/success/error) without breaking page rendering.
- Refresh the server-rendered player after success so the PR-7 header progress chip reflects `Completed / 100%`.

Out of scope:
- No API/backend changes (endpoint already exists)
- No Prisma schema/migrations
- No progress position tracking changes
- No gating/quiz/unlock enforcement yet
- No auth changes

## Current State (Repo-Grounded)

- Player page (`/Users/poski/academy/apps/web/app/learn/[sectionId]/page.tsx`) already calls `startSectionProgress()` and passes `sectionProgress` to player components.
- Player header chip (PR-7) is server-rendered in `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`.
- Progress client already has:
  - `startSectionProgress`
  - `getSectionProgress`
  - `getModuleProgress`
  - `getPathProgress`
- Backend `POST /v1/progress/sections/:sectionId/complete` already exists and is e2e-tested.

This makes PR-8 web-only and compact.

## Exact Files To Modify

### Web (`/Users/poski/academy/apps/web`)
- `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`
- `/Users/poski/academy/apps/web/src/components/player/PlayerLayout.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`
- `/Users/poski/academy/apps/web/app/globals.css`

### New File (recommended for minimal client surface)
- `/Users/poski/academy/apps/web/src/components/player/PlayerCompleteButton.tsx`

### No Changes
- `/Users/poski/academy/apps/api/**`
- `/Users/poski/academy/apps/web/app/learn/[sectionId]/page.tsx` (no change needed; it already passes `currentSectionId` to `PlayerLayout`)
- `/Users/poski/academy/apps/web/src/lib/progress-types.ts` (existing `SectionProgress` is sufficient)

## Important Public API / Interface Changes

### No backend API changes
PR-8 uses existing:
- `POST /v1/progress/sections/:sectionId/complete`

### Web API client addition
Add helper in `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`:
- `completeSectionProgress(sectionId: string): Promise<SectionProgress>`

Implementation:
- Reuse `fetchProgressJson<T>()`
- `method: 'POST'`
- No custom error handling in client helper (UI handles errors)

## UI/Interaction Design (Decision Complete)

### CTA Placement
Add the new CTA inside the existing player footer in `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`, positioned between the existing prev/next buttons:

- `Previous Section` | `Mark Complete` | `Next Section`

This preserves current navigation layout and keeps the action close to the progression controls.

### CTA Behavior
Initial label/state:
- If `sectionProgress?.status === 'completed'`: disabled, label `Completed`
- Otherwise: enabled, label `Mark Complete`

On click:
1. Disable button and show `Completing...`
2. Call `completeSectionProgress(sectionId)`
3. On success:
   - update local button state to completed immediately (`Completed`)
   - clear any prior error
   - trigger `router.refresh()` so server-rendered header chip updates
4. On failure:
   - restore enabled state (unless already completed)
   - show inline non-fatal error text in footer
   - keep page usable

### Error Message (Footer-Local)
Render a short inline message below/next to the button area:
- Example text: `Unable to mark section complete. Try again.`
- Non-blocking; navigation buttons remain usable

### Accessibility
- Use a real `<button type="button">`
- Provide disabled state via `disabled` attribute
- Error/status text should use `aria-live="polite"` to announce updates without interrupting navigation

## Implementation Approach (Minimize Client Surface)

### 1) Keep `PlayerContent` as a Server Component
Do **not** convert `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx` to `use client`.

Reason:
- Keeps lesson block rendering server-rendered
- Minimizes bundle growth and PR size
- Local interactivity is isolated to one leaf component

### 2) Add a New Client Component: `PlayerCompleteButton.tsx`
Create `/Users/poski/academy/apps/web/src/components/player/PlayerCompleteButton.tsx` with `use client`.

Props:
- `sectionId: string`
- `initialSectionProgress?: SectionProgress | null`

Internal local state:
- `isSubmitting: boolean`
- `completed: boolean` (derived from initial progress, updated on success)
- `errorMessage: string | null`

Hooks:
- `useRouter()` from `next/navigation`
- `useTransition()` for `router.refresh()` (recommended)
- No external state library

Success handling:
- Use the `SectionProgress` response from `completeSectionProgress(...)`
- Treat `response.status === 'completed'` as authoritative
- Call `router.refresh()` after local state updates so header chip re-renders from server

### 3) `PlayerLayout.tsx` Prop Plumbing
`PlayerLayout` already receives:
- `currentSectionId`
- `sectionProgress`

Modify `/Users/poski/academy/apps/web/src/components/player/PlayerLayout.tsx` to pass `currentSectionId` into `PlayerContent` (new prop), while continuing to pass `sectionProgress`.

### 4) `PlayerContent.tsx` Footer Integration
Add prop:
- `currentSectionId: string`

Render `<PlayerCompleteButton />` in footer with:
- `sectionId={currentSectionId}`
- `initialSectionProgress={sectionProgress}`

No changes to header chip logic (PR-7). The header updates after `router.refresh()`.

## CSS Plan (`/Users/poski/academy/apps/web/app/globals.css`)

Add minimal styles only:

### New classes
- `.playerCompleteBtn`
- `.playerCompleteBtn.isSuccess`
- `.playerCompleteBtn:disabled` (or shared disabled styling selector for buttons)
- `.playerFooterCenter` (optional wrapper if needed for layout)
- `.playerFooterError`

### Styling decisions
- Reuse the visual language of `.playerNavBtn`
- Make complete CTA visually distinct (green-accent success/progression tone)
- Keep mobile behavior compatible with existing footer media rule (`flex-direction: column`)
- If using a footer-center wrapper, ensure it spans full width cleanly on mobile

### Exact selector strategy (recommended)
- Base button class includes `playerNavBtn playerCompleteBtn`
- Disabled appearance should work for native `<button disabled>`
  - Add `.playerCompleteBtn:disabled` style (do not rely only on `.isDisabled` / `aria-disabled` styles)
- Error text uses muted red tone, smaller font, and wraps

## Data Flow (End-to-End)

### Initial page load
1. `/learn/[sectionId]` fetches content + `startSectionProgress(...)`
2. `PlayerLayout` receives `currentSectionId` and `sectionProgress`
3. `PlayerContent` renders:
   - header chip from `sectionProgress` (server)
   - complete CTA initialized from `sectionProgress` (client)

### User clicks “Mark Complete”
1. Client button calls `POST /v1/progress/sections/:sectionId/complete`
2. UI updates local button state immediately (`Completed`)
3. `router.refresh()` re-renders page
4. Header chip reflects `Completed · 100% complete`

## Edge Cases / Failure Modes

1. **Progress unavailable on initial load**
- `sectionProgress` may be `null` if `startSectionProgress()` failed
- CTA still renders enabled (recommended)
- Reason: `complete` endpoint can still succeed and auto-start+complete
- If it fails (e.g., missing `NEXT_PUBLIC_TEMP_USER_ID`), show inline error and keep page usable

2. **Already completed section**
- Initial status `completed` disables button immediately
- Clicking is not possible; no duplicate network call

3. **Double-click / rapid click**
- `isSubmitting` disables button during request
- Prevents duplicate UI requests from a single session interaction

4. **Backend returns error (400/404/500)**
- Show inline error message
- Do not crash player
- Prev/next navigation remains functional

5. **`router.refresh()` fails or is slow**
- Button local state still shows completion success if API call succeeded
- Header chip may lag until refresh finishes; acceptable for PR-8

## Test Cases and Scenarios

### Automated (Web)
Recommended minimal verification:
- `pnpm --filter @academy/web typecheck`
- `pnpm --filter @academy/web test`

No new automated UI test required in PR-8 (repo currently lacks React component test setup for interactive player components).

### Manual Verification (Primary)
1. **Happy path completion**
- Open `/learn/[sectionId]` with valid `NEXT_PUBLIC_TEMP_USER_ID`
- Click `Mark Complete`
- Expected:
  - Button shows pending state then `Completed`
  - Header chip updates to `Completed` and `100% complete` after refresh

2. **Already completed**
- Reload completed section
- Expected:
  - Button is disabled with `Completed`
  - Header chip shows completed state

3. **Missing temp user env**
- Unset `NEXT_PUBLIC_TEMP_USER_ID`, reload player
- Click `Mark Complete`
- Expected:
  - Player renders
  - CTA shows non-fatal error
  - No crash / navigation still works

4. **API unavailable**
- Stop API and open player (or induce failure)
- Expected:
  - Existing page error behavior for content fetch remains
  - If content loads but complete call fails, footer error appears and UI remains usable

5. **Idempotent backend behavior visible**
- Click complete on a section, reload, click not possible (disabled)
- Confirms UI aligns with existing backend idempotency semantics

## Acceptance Criteria

- Player footer includes a `Mark Complete` CTA on `/learn/[sectionId]`.
- Clicking the CTA calls existing `POST /v1/progress/sections/:sectionId/complete`.
- CTA shows local pending/success/error states without crashing the page.
- On success, the player header progress chip updates after refresh to `Completed` / `100%`.
- No backend/API code changes or Prisma changes.
- Existing player navigation (prev/next) remains functional.

## Explicit Assumptions and Defaults

- PR-8 remains web-only because the backend complete endpoint already exists and is tested.
- `PlayerContent` stays server-rendered; a new leaf client component is used for interactivity.
- CTA is shown even when initial `sectionProgress` is `null` because `complete` can create/start+complete server-side.
- No optimistic header-chip update in client; server refresh is the source of truth for header status.
- No gating/quiz enforcement yet, so complete CTA is always available unless already completed.
