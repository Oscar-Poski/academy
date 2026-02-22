# PR-6 Plan: Web Progress Indicators on Path/Module Pages (Read-Only Wiring)

## Summary

PR-6 adds learner-visible progress indicators to the existing web pages using already-implemented backend endpoints.

Scope:
- Show path-level and module-level progress summaries on `/paths/[pathId]`
- Show module progress + per-section status badges on `/modules/[moduleId]`
- Keep pages readable when progress is unavailable (API down or `NEXT_PUBLIC_TEMP_USER_ID` missing)

Out of scope:
- No API/backend changes
- No player page changes
- No progress mutations (start/position/complete) beyond what already exists
- No auth changes

## Scope Guardrails

1. Modify only web files under `/Users/poski/academy/apps/web/**`.
2. Do not change `/Users/poski/academy/apps/api/**`.
3. Do not change Next.js config or tsconfig files.
4. Keep routes as ID-based (`[pathId]`, `[moduleId]`) and server-component rendering.

## Exact Files To Modify

### Modify
- `/Users/poski/academy/apps/web/src/lib/progress-types.ts`
- `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`
- `/Users/poski/academy/apps/web/app/paths/[pathId]/page.tsx`
- `/Users/poski/academy/apps/web/app/modules/[moduleId]/page.tsx`
- `/Users/poski/academy/apps/web/app/globals.css`

### No New Files (preferred)
Keep PR compact by avoiding new shared UI components for now.

## Public Interfaces / Type Additions (Web Local Types Only)

Add to `/Users/poski/academy/apps/web/src/lib/progress-types.ts` (mirrors existing API DTOs):

```ts
export type ModuleSectionProgressItem = {
  sectionId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  completionPct: number;
  lastBlockOrder: number | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  sectionVersionId: string | null;
};

export type ModuleProgress = {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
  sections: ModuleSectionProgressItem[];
};

export type PathModuleProgressItem = {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
};

export type PathProgress = {
  pathId: string;
  completionPct: number;
  completedModules: number;
  totalModules: number;
  modules: PathModuleProgressItem[];
};
```

Add read methods in `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`:
- `getPathProgress(pathId: string): Promise<PathProgress>`
- `getModuleProgress(moduleId: string): Promise<ModuleProgress>`

No backend contract changes.

## Data Fetching Plan (Server Components)

### `/Users/poski/academy/apps/web/app/paths/[pathId]/page.tsx`
Fetch in parallel:
- `getPath(params.pathId)` (required)
- `getPathProgress(params.pathId).catch(() => null)` (optional/fallback-safe)

Rendering behavior:
- Path content must render even if progress fetch fails.
- If progress exists:
  - Show path summary row near header with:
    - `completionPct`
    - `completedModules / totalModules`
  - Show module-level progress summary on each module card using `progress.modules[]`.
- If progress is unavailable:
  - Show muted notice once near the header.
  - Omit module badges (or show neutral “Progress unavailable” chip only if desired; preferred: omit to reduce noise).

### `/Users/poski/academy/apps/web/app/modules/[moduleId]/page.tsx`
Fetch in parallel:
- `getModule(params.moduleId)` (required)
- `getModuleProgress(params.moduleId).catch(() => null)` (optional/fallback-safe)

Rendering behavior:
- Module content must render even if progress fetch fails.
- If progress exists:
  - Show module summary row in header (`completionPct`, `completedSections / totalSections`).
  - Merge `module.sections` with `progress.sections` by `sectionId`.
  - Render each section row with status badge:
    - `Completed`
    - `In Progress`
    - `Not Started`
  - Optional inline numeric pct for `in_progress` rows (keep if present in DTO).
- If progress unavailable:
  - Show one muted notice and render current section list as-is.

## UI / Markup Decisions (Decision Complete)

### Path Page Header Additions
Inside existing `.pageHeader.playerCard`:
- Add a `.pageMetaRow` container under description.
- If progress available, render:
  - one badge chip (`Path Progress`)
  - one summary text line (`{pct}% complete · {completedModules}/{totalModules} modules`)
- If unavailable, render muted text:
  - `Progress indicators unavailable (API or temp user not configured).`

### Path Module Card Additions
In each module card header (`.pageCardHeader`):
- Keep title + `Open Module` link.
- If module progress exists, render a compact badge aligned with header content:
  - text: `{pct}% · {completedSections}/{totalSections} sections`
- No section-level badges on path page (keep PR compact).

### Module Page Header Additions
Inside module page header:
- Add `.pageMetaRow`.
- If progress available, show summary badge/text:
  - `{pct}% complete · {completedSections}/{totalSections} sections`
- If unavailable, show muted notice.

### Module Page Section List Rows
Change section list item markup from simple link-only row to:
- left: section link
- right: status badge (+ optional `%` for in-progress)

Preferred structure:
- `.pageListItem` wraps `.pageListRow`
- `.pageListRowMain` contains `Link`
- `.pageListRowMeta` contains badge(s)

Badge variants:
- `.progressBadge.progressBadge--notStarted`
- `.progressBadge.progressBadge--inProgress`
- `.progressBadge.progressBadge--completed`

## CSS Additions in `/Users/poski/academy/apps/web/app/globals.css`

Add styles only (no global redesign):
- `.pageMetaRow`
- `.pageProgressSummary`
- `.pageProgressNotice`
- `.pageListRow`
- `.pageListRowMain`
- `.pageListRowMeta`
- `.progressBadge`
- `.progressBadge--notStarted`
- `.progressBadge--inProgress`
- `.progressBadge--completed`

Style rules:
- Keep current dark theme palette.
- Use existing border/radius language.
- Ensure section rows remain legible on mobile (allow wrap, avoid fixed widths).

## Error Handling / Fallback Rules

1. `getPath` / `getModule` failures behave exactly as today.
- `404` still maps to `notFound()`.
- Other errors still throw.

2. Progress fetch failures are non-fatal.
- Catch and return `null`.
- Render content without progress UI.
- Do not block page SSR.

3. Missing `NEXT_PUBLIC_TEMP_USER_ID` is treated as progress-unavailable.
- This currently throws from `getTempUserId()`.
- Catching progress fetch in page is sufficient; no client changes required.

## Implementation Notes (Exact Approach)

### `/paths/[pathId]/page.tsx`
- Use `Promise.all([getPath(...), getPathProgress(...).catch(() => null)])`
- Build `Map<string, PathModuleProgressItem>` from `pathProgress?.modules`
- Render module progress by module ID lookup
- Do not sort/reorder modules; keep content API ordering as source of truth

### `/modules/[moduleId]/page.tsx`
- Use `Promise.all([getModule(...), getModuleProgress(...).catch(() => null)])`
- Build `Map<string, ModuleSectionProgressItem>` from `moduleProgress?.sections`
- For each section, derive display state:
  - default `not_started`
  - default `completionPct = 0`
- Display labels:
  - `not_started` -> `Not Started`
  - `in_progress` -> `In Progress`
  - `completed` -> `Completed`

### `/src/lib/api-clients/progress.client.ts`
Add:
- `getModuleProgress(moduleId)`
- `getPathProgress(pathId)`

Reuse existing `fetchProgressJson<T>()` and temp-user header logic unchanged.

## Test Cases and Scenarios

### Manual Verification (Primary)
1. **Progress unavailable fallback**
- Unset `NEXT_PUBLIC_TEMP_USER_ID` and open path/module pages.
- Expected: page content renders; progress notice appears; no crash.

2. **Fresh user (no progress rows)**
- Set `NEXT_PUBLIC_TEMP_USER_ID` to a valid existing user with no progress.
- Open path and module pages.
- Expected: `0%` summaries and `Not Started` badges.

3. **In-progress state visible**
- Start a section and patch position via existing API.
- Open parent module page.
- Expected: that section shows `In Progress`; module summary reflects partial completion rules from backend (still based on completed sections, likely 0%).

4. **Completed state visible**
- Complete one section via existing API.
- Open module page and path page.
- Expected: section shows `Completed`; module/path percentages and counts update.

5. **404 behavior unchanged**
- Open nonexistent path/module ID.
- Expected: `notFound()` behavior remains unchanged.

### Optional Web Test (Only If Low-Friction)
- Skip adding automated tests in PR-6 unless a pure formatter helper is introduced.
- Reason: this PR is mostly SSR page wiring and visual rendering.

## Acceptance Criteria

- `/paths/[pathId]` shows path-level summary and per-module progress summaries when progress API is available.
- `/modules/[moduleId]` shows module-level summary and per-section status badges when progress API is available.
- Both pages still render normally when progress API calls fail or temp user env is missing.
- No API code changes and no regressions to current `notFound()` behavior.

## Assumptions and Defaults

- Progress percentages are authoritative from backend DTOs (web does not recompute them).
- Module/page progress summaries use existing backend semantics (module/path pct based on completed sections, not in-progress pct).
- UI remains server-rendered only (no `use client`, no optimistic updates).
- Temp user strategy (`x-user-id` via `NEXT_PUBLIC_TEMP_USER_ID`) remains in place for this PR.
