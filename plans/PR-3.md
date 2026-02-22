## PR-3 Plan: First Read-Only Course Player UI (Web Only)

### Summary
Implement the first static course player UI in `/Users/poski/academy/apps/web` that consumes existing PR-2 content APIs and renders:

- path page (`/paths/[pathId]`)
- module page (`/modules/[moduleId]`)
- player page (`/learn/[sectionId]`) with:
  - breadcrumb
  - left navigation tree
  - lesson block rendering
  - prev/next navigation buttons

No progress persistence, no auth, no API changes, no Prisma changes.

---

## 1) Proposed Folder Structure (apps/web)

```txt
apps/web/app/
  page.tsx                           (modify import only if api helper is moved)
  paths/
    [pathId]/
      page.tsx
  modules/
    [moduleId]/
      page.tsx
  learn/
    [sectionId]/
      page.tsx

apps/web/src/components/player/
  PlayerLayout.tsx
  PlayerSidebar.tsx
  PlayerContent.tsx
  LessonBlockRenderer.tsx
  blocks/
    MarkdownBlock.tsx
    CalloutBlock.tsx
    CodeBlock.tsx
    ChecklistBlock.tsx
    QuizPlaceholderBlock.tsx

apps/web/src/lib/api/
  content.client.ts
  health.client.ts                   (if refactoring existing api.ts due path conflict)
  index.ts                           (optional re-exports)

apps/web/src/lib/
  content-types.ts                   (local response DTO types for web consumption)
```

Note: `apps/web/src/lib/api.ts` currently exists and conflicts with `apps/web/src/lib/api/content.client.ts`. Plan is to refactor it into `apps/web/src/lib/api/health.client.ts` and update imports.

---

## 2) Exact Files to Create / Modify (apps/web only)

### Create
- `/Users/poski/academy/apps/web/app/paths/[pathId]/page.tsx`
- `/Users/poski/academy/apps/web/app/modules/[moduleId]/page.tsx`
- `/Users/poski/academy/apps/web/app/learn/[sectionId]/page.tsx`

- `/Users/poski/academy/apps/web/src/components/player/PlayerLayout.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerSidebar.tsx`
- `/Users/poski/academy/apps/web/src/components/player/PlayerContent.tsx`
- `/Users/poski/academy/apps/web/src/components/player/LessonBlockRenderer.tsx`

- `/Users/poski/academy/apps/web/src/components/player/blocks/MarkdownBlock.tsx`
- `/Users/poski/academy/apps/web/src/components/player/blocks/CalloutBlock.tsx`
- `/Users/poski/academy/apps/web/src/components/player/blocks/CodeBlock.tsx`
- `/Users/poski/academy/apps/web/src/components/player/blocks/ChecklistBlock.tsx`
- `/Users/poski/academy/apps/web/src/components/player/blocks/QuizPlaceholderBlock.tsx`

- `/Users/poski/academy/apps/web/src/lib/api/content.client.ts`
- `/Users/poski/academy/apps/web/src/lib/content-types.ts`

### Modify
- `/Users/poski/academy/apps/web/app/page.tsx` (import path update only, if `src/lib/api.ts` is refactored)
- `/Users/poski/academy/apps/web/src/lib/api.ts` (refactor/move to avoid file-vs-folder conflict)
  - Preferred outcome:
    - create `/Users/poski/academy/apps/web/src/lib/api/health.client.ts`
    - create `/Users/poski/academy/apps/web/src/lib/api/index.ts`
    - keep existing functionality
- `/Users/poski/academy/apps/web/app/globals.css` (add player/page styles only; no config changes)

No changes to:
- `/Users/poski/academy/apps/web/next.config.mjs`
- `/Users/poski/academy/apps/web/tsconfig.json`

---

## 3) Layout Strategy (Server vs Client Components)

### Page-level routes: Server Components
Use server components for all 3 pages:
- `/paths/[pathId]/page.tsx`
- `/modules/[moduleId]/page.tsx`
- `/learn/[sectionId]/page.tsx`

Reason:
- deterministic fetches
- no client cache library needed
- aligns with “read-only, simple, no SWR/React Query”

### Presentational components: Mostly Server Components
Keep `PlayerLayout`, `PlayerSidebar`, `PlayerContent`, `LessonBlockRenderer`, and block components as server-safe presentational components (no hooks, no client state).

No `use client` needed in PR-3 unless a UI interaction forces it (none currently do).

---

## 4) How `PlayerLayout` Composes Sidebar + Content

### `PlayerLayout` responsibilities
- Receives already-fetched data props from `/learn/[sectionId]/page.tsx`
- Renders two-column layout:
  - left: sidebar navigation tree
  - right: content panel (breadcrumb, title, blocks, prev/next controls)

### Composition
- `PlayerLayout`
  - `PlayerSidebar`
    - receives path tree + current section ID
  - `PlayerContent`
    - receives breadcrumb labels
    - section title
    - lesson blocks
    - navigation object

### Props (high-level)
- `PlayerLayout`
  - `pathTree`
  - `moduleId`
  - `currentSectionId`
  - `sectionTitle`
  - `lessonBlocks`
  - `navigation`
- `PlayerSidebar`
  - `pathTitle`
  - `modules[]`
  - `currentSectionId`
- `PlayerContent`
  - `breadcrumb`
  - `title`
  - `lessonBlocks`
  - `navigation`

---

## 5) LessonBlockRenderer Architecture

### `LessonBlockRenderer`
- Receives one block DTO
- `switch (block.blockType)` dispatch to block components:
  - `markdown` -> `MarkdownBlock`
  - `callout` -> `CalloutBlock`
  - `code` -> `CodeBlock`
  - `checklist` -> `ChecklistBlock`
  - `quiz` -> `QuizPlaceholderBlock`

### Block component responsibilities
- Parse expected `contentJson` shape defensively
- Render fallback UI if shape is malformed
- Remain presentational only (no persistence, no scoring)

### Unknown block type handling
- Render a generic fallback card:
  - “Unsupported block type”
  - include `blockType` string for debugging
- Do not crash the page

---

## 6) Styling Approach (Simple Tailwind Assumed)

### Assumption
Tailwind-style utility classes are assumed for component markup (per your requirement).  
If Tailwind is not actually installed in the repo, PR-3 should still avoid config changes and use `globals.css` class-based styling as a fallback, but the plan assumes utility-first styling semantics.

### Practical styling direction
- Preserve existing dark visual theme from `globals.css`
- Add player-specific classes in `globals.css` (safe, no config changes):
  - split layout
  - sticky sidebar
  - card/panel surfaces
  - block spacing
  - active section highlight
  - disabled nav button style
- Keep styles simple and deterministic (no animations, no client JS)

---

## 7) Data Flow: Route -> API Client -> Components

### Shared API client (`src/lib/api/content.client.ts`)
Implement fetch helpers targeting `NEXT_PUBLIC_API_BASE_URL` (with localhost fallback):
- `getPath(pathId)`
- `getModule(moduleId)`
- `getSection(sectionId)`

Also keep/relocate `getApiHealth()` helper to avoid path conflict.

### `/paths/[pathId]/page.tsx`
- Fetch: `GET /v1/paths/:pathId`
- Render simple path detail page:
  - path title
  - module cards/list
  - nested section links to `/learn/[sectionId]`
  - optional link to `/modules/[moduleId]`

### `/modules/[moduleId]/page.tsx`
- Fetch: `GET /v1/modules/:moduleId`
- Render module title + ordered sections list with links to `/learn/[sectionId]`

### `/learn/[sectionId]/page.tsx` (main player)
Because PR-2 section endpoint returns only `moduleId` (not module/path titles), use chained fetching:

1. Fetch section detail: `GET /v1/sections/:sectionId`
   - gives `moduleId`, section title, blocks, navigation
2. Fetch module detail using `moduleId`: `GET /v1/modules/:moduleId`
   - gives `pathId`, module title, ordered sections
3. Fetch path tree using `pathId`: `GET /v1/paths/:pathId`
   - gives path title + full module/section tree for sidebar

### Fetch sequencing
- Step 1 required first (need `moduleId`)
- Step 2 required second (need `pathId`)
- Step 3 can run after step 2
- Once all data is resolved, pass to `PlayerLayout`

### Error handling in routes
- If fetch returns 404/not ok -> use `notFound()` in page route
- If API unavailable -> render minimal error state (simple fallback UI)

---

## 8) DTO / Web Types to Mirror PR-2 API Responses

Create `/Users/poski/academy/apps/web/src/lib/content-types.ts` with local interfaces matching current PR-2 API payloads:

- `PathListItem`
- `PathTree`
- `PathTreeModule`
- `PathTreeSection`
- `ModuleDetail`
- `ModuleDetailSection`
- `SectionDetail`
- `SectionLessonBlock`
- `SectionNavigation`

This keeps UI code typed without importing backend-only Nest/Prisma types.

---

## 9) Edge Cases (explicit handling)

### Section without blocks
- `lessonBlocks.length === 0`
- Render empty-state panel in `PlayerContent`:
  - “No lesson blocks available for this section yet.”

### Unknown `blockType`
- Render fallback via `LessonBlockRenderer`
- Do not throw

### Navigation null states
- `prevSectionId === null`
  - Prev button disabled, non-clickable
- `nextSectionId === null`
  - Next button disabled, non-clickable

### Path/module missing data
- `/paths/[pathId]` or `/modules/[moduleId]` 404 from API -> `notFound()`

### Sidebar highlight when section not found in tree
- Fallback: render tree normally with no active highlight (should not happen if API data is consistent)

---

## 10) Manual Verification (after implementation)

### Start services (existing workflow)
- API running on `http://localhost:3001`
- Web running on `http://localhost:3000`

### Verify pages
1. Get an ID:
```bash
curl -s http://localhost:3001/v1/paths | jq
```

2. Open path page:
- `http://localhost:3000/paths/<PATH_ID>`

Expected:
- Path title visible
- Modules listed
- Sections listed and linked

3. Open module page:
- `http://localhost:3000/modules/<MODULE_ID>`

Expected:
- Module title visible
- Ordered section list
- Links to `/learn/<SECTION_ID>`

4. Open player page:
- `http://localhost:3000/learn/<SECTION_ID>`

Expected:
- Breadcrumb: `Path / Module / Section`
- Left sidebar tree with current section highlighted
- Right content rendering seeded blocks
- Prev/Next buttons at bottom
- Disabled button at boundaries

---

## Assumptions and Defaults
- `NEXT_PUBLIC_API_BASE_URL` is used for web fetches; fallback `http://localhost:3001`
- PR-2 API response shapes remain unchanged
- Tailwind-style utility usage is assumed conceptually, but no Next config/tsconfig changes will be made
- No client-side state management library in PR-3
