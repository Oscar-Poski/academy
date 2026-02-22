# PR-7 Plan: Section Progress Read Endpoint + Player Header Progress Chip

## Summary

PR-7 adds a read-only section-progress API endpoint and surfaces section progress status in the player header on `/learn/[sectionId]`.

Goals:
- Expose current progress for a specific user+section without mutating state.
- Show a compact progress chip in the player header (`Not Started` / `In Progress` / `Completed` + `% complete`).
- Preserve current player behavior where page load calls `startSectionProgress()` (PR-4) and tolerate progress failures without breaking content rendering.

Out of scope:
- No changes to progress mutation semantics (`start`, `position`, `complete`)
- No Prisma schema/migration changes
- No auth changes
- No player interaction changes (no complete button yet)
- No API/content DTO changes

---

## Current State (Repo-Grounded)

- `apps/api` already exposes:
  - `POST /v1/progress/sections/:sectionId/start`
  - `PATCH /v1/progress/sections/:sectionId/position`
  - `POST /v1/progress/sections/:sectionId/complete`
  - `GET /v1/progress/modules/:moduleId`
  - `GET /v1/progress/paths/:pathId`
  - `GET /v1/progress/continue`
- `ProgressService` already has:
  - `assertKnownUser(...)`
  - `toSectionProgressDto(...)`
- `apps/web/app/learn/[sectionId]/page.tsx` already calls `startSectionProgress(section.id).catch(() => null)` but discards the returned progress.
- PR-6 already introduced reusable `.progressBadge` CSS styles.

This means PR-7 can be small and additive.

---

## Exact Files To Modify

### API (`/Users/poski/academy/apps/api`)
- `/Users/poski/academy/apps/api/src/modules/progress/progress.controller.ts`
- `/Users/poski/academy/apps/api/src/modules/progress/progress.service.ts`
- `/Users/poski/academy/apps/api/test/progress.e2e-spec.ts`

### Web (`/Users/poski/academy/apps/web`)
- `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`
- `/Users/poski/academy/apps/web/app/learn/[sectionId]/page.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerLayout.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`
- `/Users/poski/academy/apps/web/app/globals.css`

### No Changes
- No Prisma files
- No DTO files in API (`SectionProgressDto` reused)
- No web progress type file changes required (`SectionProgress` already exists)

---

## Important Public API / Interface Additions

### New API Endpoint
- `GET /v1/progress/sections/:sectionId`

Headers:
- Required: `x-user-id`

Response (200):
- Existing `SectionProgressDto` shape (same as `start` / `position` / `complete`)

Errors:
- `400` if `x-user-id` missing/unknown (existing `assertKnownUser` behavior)
- `404` if section progress row for that user+section does not exist
- `404` if section does not exist is **not required** for GET path; endpoint is row-based and can return generic progress-not-found (see behavior below)

### Web Client Addition
- `getSectionProgress(sectionId: string): Promise<SectionProgress>` in `/Users/poski/academy/apps/web/src/lib/api-clients/progress.client.ts`

Note:
- PR-7 web flow will **not** use this on initial `/learn` render; it is added for API completeness and future PRs.

---

## API Implementation Plan

### Controller Changes (`progress.controller.ts`)
Add a new handler above module/path routes for clarity:

- `@Get('sections/:sectionId')`
- Signature:
  - `getSectionProgress(@Param('sectionId') sectionId: string, @Headers('x-user-id') userId: string): Promise<SectionProgressDto>`

Behavior:
- Delegates to `progressService.getSectionProgress(userId, sectionId)`

No changes to existing handlers.

### Service Changes (`progress.service.ts`)
Add:

- `async getSectionProgress(userId: string, sectionId: string): Promise<SectionProgressDto>`

Implementation steps (decision complete):
1. `await this.assertKnownUser(userId)`
2. Query `userSectionProgress.findUnique` using composite key:
   - `where: { userId_sectionId: { userId, sectionId } }`
3. If no row:
   - throw `new NotFoundException(\`Progress for section ${sectionId} not found\`)`
4. Return `this.toSectionProgressDto(row)`

Important:
- This endpoint is **read-only** and must **not** call `startSection(...)`.
- No auto-create / no implicit pinning on GET.

### Error Policy (Locked In)
- `GET` does not synthesize a fake `not_started` row.
- `404` for missing row keeps semantics explicit and avoids version pin side effects.
- Existing user validation behavior is reused exactly.

---

## Web Implementation Plan

### `progress.client.ts`
Add:
- `getSectionProgress(sectionId: string): Promise<SectionProgress>`

Implementation:
- Reuse `fetchProgressJson<T>()`
- Path: `/v1/progress/sections/${sectionId}`
- No custom error mapping

### `/learn/[sectionId]/page.tsx`
Current code already does:

- `startSectionProgress(section.id).catch(() => null)` in `Promise.all(...)`

PR-7 changes:
1. Capture the result:
   - `const [module, sectionProgress] = await Promise.all([...])`
2. Pass `sectionProgress` into `PlayerLayout`

Reason:
- Avoids duplicate fetch on initial render
- Uses already-mutating `start` response as source of truth for initial chip
- Keeps fallback-safe behavior (null if progress unavailable)

### `PlayerLayout.tsx`
Add prop:
- `sectionProgress?: SectionProgress | null`

Pass through to `PlayerContent`.

No layout logic changes beyond prop plumbing.

### `PlayerContent.tsx`
Add prop:
- `sectionProgress?: SectionProgress | null`

Render a new player-header meta row under `<h1>` only when progress exists.

#### Rendering Rules
If `sectionProgress` exists:
- Render status badge using PR-6 badge classes:
  - `not_started` -> `progressBadge progressBadge--notStarted`
  - `in_progress` -> `progressBadge progressBadge--inProgress`
  - `completed` -> `progressBadge progressBadge--completed`
- Render muted summary text:
  - `${sectionProgress.completionPct}% complete`

If `sectionProgress` is `null`:
- Render nothing (silent fallback)

#### Status Label Mapping
- `not_started` -> `Not Started`
- `in_progress` -> `In Progress`
- `completed` -> `Completed`

Implementation detail:
- Define small local helper functions inside `PlayerContent.tsx` (or file-local functions above component) for label/class mapping.
- No new shared component in PR-7.

---

## CSS Plan (`apps/web/app/globals.css`)

Add minimal styles (reuse existing palette and badge styles from PR-6):

- `.playerHeaderMeta`
  - flex row, wraps, small gap
  - margin-top beneath title
- `.playerHeaderMetaText`
  - muted text color, small font

Mobile behavior:
- Allow wrap; no fixed widths
- No media-query changes required unless spacing looks off (prefer none)

No changes to existing `.progressBadge` styles.

---

## Data Flow (End-to-End)

### Initial Player Load
1. `getSection(sectionId, { includeUserContext: true })`
2. In parallel:
   - `getModule(section.moduleId)`
   - `startSectionProgress(section.id).catch(() => null)`
3. `getPath(module.pathId)`
4. Render `PlayerLayout` with:
   - content data
   - `sectionProgress` from `start` response

### Future-Proofing
`getSectionProgress()` API/client exists for later PRs (refreshing chip after mutations without re-running `start`).

---

## Test Cases and Scenarios

### API E2E (`/Users/poski/academy/apps/api/test/progress.e2e-spec.ts`)

Add a new test case using existing seeded section and test users.

#### 1. GET returns 404 when no progress row exists
- Use a user from existing `userIds` map with no prior start in the test
- Call `GET /v1/progress/sections/:sectionId`
- Expect `404`

#### 2. GET returns section progress after start
- Call `POST /v1/progress/sections/:sectionId/start`
- Then `GET /v1/progress/sections/:sectionId`
- Expect `200`
- Assert:
  - `sectionId` matches
  - `sectionVersionId` is present and equals start response
  - `status` is `in_progress` (or `completed` if using complete path in same test)
  - `completionPct` matches expected state
  - response shape matches `SectionProgressDto`

#### Optional extension (same or separate test)
- Complete section, then GET returns:
  - `status === 'completed'`
  - `completionPct === 100`
  - `completedAt` present

### Manual Web Verification

1. **Valid temp user / API running**
- Open `/learn/[sectionId]`
- Expected:
  - Page renders
  - Header shows progress badge + `% complete`
  - First load typically shows `In Progress` (because `start` runs)

2. **Completed section**
- Complete via curl/API, reload page
- Expected:
  - Header badge `Completed`
  - `100% complete`

3. **Missing `NEXT_PUBLIC_TEMP_USER_ID`**
- Unset env and reload
- Expected:
  - Player page still renders content
  - No progress chip
  - No crash

4. **404 path unchanged**
- Invalid section ID in `/learn/[sectionId]`
- Expected:
  - Existing `notFound()` behavior remains

---

## Acceptance Criteria

- `GET /v1/progress/sections/:sectionId` is implemented and returns `SectionProgressDto` for existing rows.
- Endpoint is read-only and does not create progress rows.
- Player header shows a progress chip (`status` + `% complete`) when progress is available.
- Player page still renders when progress start/read fails.
- No Prisma schema or migration changes.
- Existing progress/content behavior remains backward compatible.

---

## Explicit Assumptions and Defaults

- `x-user-id` temp user strategy remains in place and required for progress endpoints.
- `GET /v1/progress/sections/:sectionId` returns `404` for missing row (not synthesized `not_started` state).
- Initial player chip data comes from `startSectionProgress()` response to avoid an extra network call.
- No time-spent or “last seen” display in PR-7; chip is intentionally compact.
