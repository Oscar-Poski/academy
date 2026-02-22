# PR-9 Plan: Save Section Position on Explicit Prev/Next Navigation (Web-Only)

## Summary

PR-9 adds best-effort position persistence when the user clicks the player footer navigation buttons (`Previous Section` / `Next Section`).

Goal:
- Before navigating away from the current section via footer prev/next, call the existing progress position endpoint:
  - `PATCH /v1/progress/sections/:sectionId/position`
- Keep navigation working even if the progress update fails (API unavailable / temp user missing / request error).
- Keep changes compact and isolated to the web player UI.

Out of scope:
- No backend/API changes
- No scroll tracking / auto-save
- No progress updates on sidebar clicks yet
- No completion/gating changes
- No auth changes

## Current State (Repo-Grounded)

- PR-8 already added a client-side `Mark Complete` button in the player footer.
- `PlayerContent` is still a server component and renders prev/next as plain `<Link>`s.
- Web progress client already supports `start`, `complete`, `getSection`, `getModule`, `getPath`.
- Backend already supports `PATCH /v1/progress/sections/:sectionId/position` with body:
  - `last_block_order`
  - `time_spent_delta`
  - optional `completion_pct`

This makes PR-9 web-only and additive.

## Exact Files To Modify

### Modify
- `/Users/poski/academy/apps/web/src/lib/progress-types.ts`
- `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`
- `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`

### Create
- `/Users/poski/academy/apps/web/src/components/player/PlayerNavButton.tsx`

### No Changes
- `/Users/poski/academy/apps/api/**`
- `/Users/poski/academy/apps/web/app/learn/[sectionId]/page.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerLayout.tsx`
- `/Users/poski/academy/apps/web/app/globals.css` (not required; reuse existing `.playerNavBtn` / `.isDisabled` styles)

## Important Public Interfaces / Type Additions (Web Local Only)

Add a request type to `/Users/poski/academy/apps/web/src/lib/progress-types.ts`:

```ts
export type UpdateSectionPositionRequest = {
  last_block_order: number;
  time_spent_delta: number;
  completion_pct?: number;
};
```

Rationale:
- Mirrors existing API DTO
- Keeps PATCH helper typed
- No backend contract changes

Add helper in `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`:
- `updateSectionPosition(sectionId: string, body: UpdateSectionPositionRequest): Promise<SectionProgress>`

## Implementation Approach (Decision Complete)

### 1) Keep `PlayerContent` as a Server Component
Do not convert `PlayerContent` to `use client`.

Reason:
- Preserve server-rendered block content
- Minimize JS shipped
- Match the existing PR-8 pattern (isolated client leaf components)

### 2) Add `PlayerNavButton` Client Component
Create `/Users/poski/academy/apps/web/src/components/player/PlayerNavButton.tsx` with `use client`.

#### Props
- `direction: 'prev' | 'next'` (used only for semantics/label if desired)
- `label: string` (e.g. `Previous Section`, `Next Section`)
- `targetSectionId: string | null`
- `currentSectionId: string`
- `lastBlockOrderToPersist: number`

Optional prop not needed for PR-9:
- no inline error display (navigation must remain primary)

#### Behavior
If `targetSectionId` is null:
- Render disabled non-clickable fallback (same as current `span.playerNavBtn.isDisabled`)

If `targetSectionId` exists:
1. On click, disable button (local `isNavigating`)
2. Best-effort call `updateSectionPosition(currentSectionId, payload)`
3. Regardless of success/failure, navigate with `router.push(`/learn/${targetSectionId}`)`
4. No blocking error UI; silently continue navigation on failure

#### Why no inline error here
- Prev/next navigation should not be blocked or cluttered by transient save errors
- PR-9’s primary goal is best-effort persistence, not reliability UI
- We already have explicit error UI for `Mark Complete` (PR-8)

### 3) Persisted Payload Strategy (Locked In)
When prev/next is clicked, send:

```ts
{
  last_block_order: <max blockOrder in current section, or 0 if no blocks>,
  time_spent_delta: 0
}
```

Do **not** send `completion_pct` in PR-9.

Rationale:
- Objective is to persist a checkpoint (footer reached) and refresh `lastSeenAt`/`lastBlockOrder`
- Avoids inventing completion percentages without scroll tracking
- Avoids weird `in_progress + 100%` states before explicit completion

### 4) Compute Checkpoint in `PlayerContent`
`PlayerContent` already has `lessonBlocks`.

Compute once per render:
- `lastBlockOrderToPersist = lessonBlocks.length > 0 ? Math.max(...lessonBlocks.map(b => b.blockOrder)) : 0`

Then pass to both prev/next nav button components.

### 5) Replace Footer Prev/Next `<Link>`s in `PlayerContent`
Current footer has:
- left `Link` / disabled `span`
- center `PlayerCompleteButton`
- right `Link` / disabled `span`

PR-9 change:
- Replace enabled prev/next `Link`s with `<PlayerNavButton />`
- Keep disabled rendering behavior equivalent
- Keep `PlayerCompleteButton` unchanged in the center

Footer layout remains:
- `Previous Section | Mark Complete | Next Section`

## `PlayerNavButton` Detailed UX / State

### Local State
- `isNavigating: boolean`

### Button rendering
- Use real `<button type="button">` for enabled state
- Class names:
  - base: `playerNavBtn`
  - while disabled/pending: add `isDisabled`
- `disabled={isNavigating}` while request/navigation in flight

### Label during pending
- Keep the same label (`Previous Section` / `Next Section`) in PR-9
- Reason: minimize UI churn and avoid layout shifts

### Navigation behavior on patch failure
- Catch all errors from `updateSectionPosition(...)`
- Continue with `router.push(...)`
- No `throw`, no error UI

## Data Flow (End-to-End)

### Initial `/learn/[sectionId]` render
- No change from PR-8 (content + progress + header chip + complete CTA)

### User clicks Prev/Next
1. `PlayerNavButton` receives current section ID, target section ID, and footer checkpoint block order
2. Calls `PATCH /v1/progress/sections/:currentSectionId/position` with `time_spent_delta: 0`
3. On success or failure, navigates to `/learn/:targetSectionId`
4. New page load triggers existing `startSectionProgress()` behavior for the destination section (unchanged)

## Edge Cases / Failure Modes

1. **No lesson blocks**
- Persist `last_block_order: 0`
- Valid per API validation (`non-negative integer`)

2. **Missing `NEXT_PUBLIC_TEMP_USER_ID`**
- PATCH helper throws before request
- Error is swallowed
- Navigation still proceeds

3. **API unavailable / PATCH fails**
- Error swallowed
- Navigation still proceeds
- No visible regression to user flow

4. **Rapid repeated clicks**
- Local `isNavigating` disables the clicked button
- Prevents duplicate PATCH + push sequences from one button instance

5. **Already completed section**
- Nav buttons still attempt best-effort PATCH (harmless; backend preserves completed state)
- Navigation proceeds normally

## Test Cases and Scenarios

### Automated (Web)
Run:
- `pnpm --filter @academy/web typecheck`
- `pnpm --filter @academy/web test`

No new automated UI tests required in PR-9.

### Manual Verification (Primary)

1. **Next button saves position before navigation**
- Open `/learn/[sectionId]`
- Call `GET /v1/progress/sections/:sectionId` and note `lastBlockOrder` (likely `null` or previous value)
- Click `Next Section`
- Call `GET /v1/progress/sections/:originalSectionId`
- Expected:
  - `lastSeenAt` updated
  - `lastBlockOrder` becomes the current section’s last block order (or `0` if empty)

2. **Previous button also saves position**
- Open a section with a previous navigation target
- Click `Previous Section`
- Check the original section’s progress row
- Expected same best-effort checkpoint update behavior

3. **Missing temp user env**
- Unset `NEXT_PUBLIC_TEMP_USER_ID`
- Click prev/next
- Expected:
  - Navigation still works
  - No crash

4. **API unavailable**
- Stop API after page is loaded (or induce PATCH failure)
- Click prev/next
- Expected:
  - Navigation still works
  - No visible error required in PR-9

5. **Disabled nav states unchanged**
- First section: no previous button action (disabled)
- Last section: no next button action (disabled)

## Acceptance Criteria

- Clicking enabled player footer prev/next triggers a best-effort call to `PATCH /v1/progress/sections/:sectionId/position` before navigation.
- Payload uses `last_block_order` and `time_spent_delta: 0` (no `completion_pct`).
- Navigation still proceeds if the position update fails.
- `PlayerContent` remains a server component.
- No backend/API changes and no Prisma changes.
- Existing footer layout and `Mark Complete` CTA remain functional.

## Explicit Assumptions and Defaults

- PR-9 only covers footer prev/next clicks, not sidebar navigation clicks.
- “Reached footer” is approximated as `last_block_order = max(blockOrder)` from rendered lesson blocks.
- `completion_pct` is intentionally omitted until real scroll/reading progress tracking exists.
- Silent failure on position-save is preferred over blocking navigation or adding error UI for this PR.
