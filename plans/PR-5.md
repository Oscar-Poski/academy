## PR-5 Plan: Version-Aware `GET /v1/sections/:sectionId` Using Progress-Pinned `sectionVersionId`

### Summary
PR-5 will make content section retrieval version-aware by user context, while preserving backward compatibility.

Main change:
- Enhance `GET /v1/sections/:sectionId` to optionally inspect `x-user-id`
- If the user has pinned progress (`user_section_progress`) for that section, serve that pinned `sectionVersionId`
- Otherwise continue serving the current published version (existing behavior)

No Prisma schema changes, no migrations, no auth implementation, no changes to non-section content endpoints.

---

## 1) Exact Files to Create / Modify (API + Web)

### API (`apps/api/**`)

#### Modify
- `apps/api/src/modules/content/content.controller.ts`
  - accept optional `x-user-id` header on `GET /v1/sections/:sectionId`
  - pass it to `ContentService.getSection(...)`

- `apps/api/src/modules/content/content.service.ts`
  - add version-aware resolution logic using `user_section_progress`
  - preserve current DTO shape and navigation behavior
  - add fallback logic if pinned version no longer exists

- `apps/api/test/content.e2e-spec.ts` **or** create a dedicated versioning-focused e2e file (recommended below)

#### Create (recommended for isolation)
- `apps/api/test/content-versioning.e2e-spec.ts`
  - focused e2e coverage for version-aware section retrieval
  - avoids overloading existing PR-2 content tests

### Web (`apps/web/**`)

#### Modify
- `apps/web/src/lib/api-clients/content.client.ts`
  - allow `getSection()` to optionally include `x-user-id` header (using existing `getTempUserId()`)

- `apps/web/app/learn/[sectionId]/page.tsx`
  - call `getSection(sectionId)` with user-context header enabled
  - keep rest of player composition unchanged

### No changes
- `apps/api/prisma/schema.prisma`
- any migration files
- `apps/web/next.config.mjs`
- any web `tsconfig.json`

---

## 2) Controller / Service Changes Needed in `ContentModule`

### `ContentController` changes
Current:
- `getSection(@Param('sectionId') sectionId: string)`

Planned:
- `getSection(@Param('sectionId') sectionId: string, @Headers('x-user-id') userId?: string)`
- `userId` is optional
- Pass to service: `contentService.getSection(sectionId, userId)`

Behavioral policy:
- Missing header is valid and remains public behavior
- Unknown `x-user-id` should **not** fail the content endpoint; treat as “no progress row” and return published version
  - This preserves backward compatibility and avoids coupling content reads to progress validation

### `ContentService` changes
Current:
- `getSection(sectionId)` always resolves current published version

Planned:
- `getSection(sectionId: string, userId?: string)`:
  1. Fetch section metadata (`id`, `moduleId`, `slug`, `title`, `sortOrder`)
  2. Resolve section version with user-aware logic (see query strategy below)
  3. Fetch navigation (same module-local prev/next ordering as PR-2)
  4. Return same `SectionDetailDto` shape with `sectionVersionId` from resolved version

No DTO shape changes required.

---

## 3) Prisma Query Strategy (High-Level) for Version Resolution

### Existing section + navigation logic stays
- Section metadata query: `section.findUnique`
- Navigation query: `section.findMany` siblings ordered by:
  - `sortOrder asc`
  - `createdAt asc`
  - `id asc`

### New version resolution flow (in `ContentService.getSection`)
Given `sectionId` and optional `userId`:

#### Step A: Try pinned progress version (only when `userId` present and non-empty)
- Query `userSectionProgress.findUnique` by composite key:
  - `where: { userId_sectionId: { userId, sectionId } }`
  - `select: { sectionVersionId: true }`
- If no row: skip to published resolution
- If row exists:
  - Query `sectionVersion.findFirst` (or `findUnique` + safety check) for that pinned version:
    - constrain by both:
      - `id = progress.sectionVersionId`
      - `sectionId = sectionId`
    - select `id` + `lessonBlocks` ordered by `blockOrder asc`, `id asc`
  - If found:
    - use it (even if status is now `archived`)
  - If not found (dangling reference edge case):
    - fallback to published resolution

Note:
- Do **not** require pinned version status to be `published`
- Allowed statuses for pinned content:
  - `published`
  - `archived`
- This avoids “draft leak” while supporting former published content after republish/migration changes

#### Step B: Fallback to currently published version
- `sectionVersion.findFirst` where:
  - `sectionId`
  - `status = published`
- order by:
  - `publishedAt desc`
  - `createdAt desc`
  - `id asc`
- select `id` + ordered `lessonBlocks`

#### Step C: Not found handling
- If section exists but neither pinned version nor published version resolves:
  - return `404`
  - message: `"No published version for section"`

This matches the required message while still honoring pinned fallback semantics.

---

## 4) Response DTO (Confirm Existing Shape + `sectionVersionId` Source)

### Existing DTO shape remains unchanged
`apps/api/src/modules/content/dto/section-detail.dto.ts` stays the same:

- `id`
- `moduleId`
- `slug`
- `title`
- `sortOrder`
- `sectionVersionId`
- `lessonBlocks[]`
- `navigation`

### `sectionVersionId` source after PR-5
- If pinned progress exists and pinned version resolves:
  - `sectionVersionId = user_section_progress.sectionVersionId`
- Else:
  - `sectionVersionId = current published section_versions.id`

### Blocks ordering remains
- `lessonBlocks` ordered by:
  - `blockOrder asc`
  - `id asc`

---

## 5) E2E Test Plan (API) with Exact Steps and Assertions

### Recommendation: Add dedicated file
Create:
- `apps/api/test/content-versioning.e2e-spec.ts`

Reason:
- Keeps PR-2 content tests stable/readable
- Avoids complex state mutation in the existing content test file

### Test setup (deterministic)
Use Prisma + seeded slugs:

- Section slug: `request-response-cycle` (seeded with v1 published, v2 draft)
- Create a dedicated existing test user in `beforeAll` (same pattern as `progress.e2e-spec.ts`)
  - `users.id = 'content-versioning-user'`
  - unique test email
- Clean any `userSectionProgress` rows for that user in `beforeEach` / `afterEach`

### Required scenario test (single test can cover all assertions)
#### Arrange
1. Load target section by slug (`request-response-cycle`)
2. Load its two versions by `(sectionId, versionNumber)`:
   - v1
   - v2
3. Assert initial statuses (or normalize them in test setup):
   - v1 = published
   - v2 = draft
4. Call `POST /v1/progress/sections/:sectionId/start` with `x-user-id`
   - pins progress to current published version (v1)
   - capture returned `sectionVersionId` and assert equals v1.id

#### Simulate publish switch (direct DB updates in test via Prisma)
Because there is no publish endpoint yet, use Prisma transaction in test:

Transaction order (important due one-published DB constraint):
1. update v1 -> `archived`
2. update v2 -> `published`
   - set `publishedAt = now`

(Do not attempt two published versions at once.)

#### Assert version-aware content behavior
1. `GET /v1/sections/:sectionId` **with** `x-user-id`
   - expect `200`
   - expect `sectionVersionId === v1.id` (pinned)
   - optionally assert blocks match v1 seeded content signature
     - e.g., first block `blockType` or known markdown text snippet from v1

2. `GET /v1/sections/:sectionId` **without** `x-user-id`
   - expect `200`
   - expect `sectionVersionId === v2.id` (current published)

3. `GET /v1/sections/:sectionId` with `x-user-id` for a different existing user **with no progress**
   - expect `200`
   - expect `sectionVersionId === v2.id` (published fallback)

### Additional edge-case test (recommended)
- If pinned version is deleted/missing (simulate by pointing row to nonexistent ID is hard due FK; so skip DB corruption simulation in e2e)
- Instead, keep this as a service-level fallback assumption documented in code comments/tests not required due FK protection

### Cleanup / restoration
Restore section version statuses in `afterEach` (or in `finally` inside the test):
- v2 -> draft
- v1 -> published (with `publishedAt` restored or set)
This prevents cross-test contamination.

### `DATABASE_URL_TEST` rule
No change needed:
- existing `apps/api/test/setup-env.ts` already enforces strict `DATABASE_URL_TEST`
- new e2e file inherits that behavior automatically

---

## 6) Web Changes (Minimal) to Send `x-user-id` for Section Fetch

### `apps/web/src/lib/api-clients/content.client.ts`
Enhance `getSection()` only (do not affect other content endpoints):

#### Planned interface (one of these patterns)
Preferred:
- `getSection(sectionId: string, options?: { includeUserContext?: boolean })`

Behavior:
- default `includeUserContext = false` to preserve existing callers / public behavior
- when `includeUserContext = true`:
  - import and use `getTempUserId()` from `apps/web/src/lib/temp-user.ts`
  - send header `x-user-id`

Why this approach:
- minimal blast radius
- keeps `/paths` and `/modules` requests public/unchanged
- avoids forcing temp user header for non-section content calls

### `apps/web/app/learn/[sectionId]/page.tsx`
Modify only the section fetch line:
- call `getSection(params.sectionId, { includeUserContext: true })`

Keep everything else unchanged:
- same player composition
- same `startSectionProgress` best-effort call
- same module/path fetch chain

### Optional note in code (recommended)
Keep/expand existing TODO:
- version pinning now affects section content fetch
- full version-aware content strategy is still limited to this endpoint and temporary user header auth

---

## 7) Optional Endpoint Decision (`/v1/sections/:sectionId/versions/:versionId`)
### Decision: Do **not** add in PR-5
Reason:
- Main requirement is fully satisfied by enhancing existing `GET /v1/sections/:sectionId`
- Adding a version debug endpoint introduces extra policy decisions (draft visibility/admin scoping) without immediate product need
- Keeps PR-5 focused and low-risk

Document future option:
- add admin/debug version endpoint later when auth/roles exist

---

## 8) Manual Verification (curl) — With and Without `x-user-id`

### Prereqs
- API running
- Existing seeded user ID in shell
- IDs fetched from current content API

```bash
USER_ID=$(docker exec academy-postgres-dev psql -U postgres -d academy_dev -tAc "select id from users where email='student@academy.local' limit 1;")
PATH_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].id')
MODULE_ID=$(curl -s http://localhost:3001/v1/paths/$PATH_ID | jq -r '.modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
```

### Start progress (pins current version)
```bash
curl -s -X POST \
  -H "x-user-id: $USER_ID" \
  "http://localhost:3001/v1/progress/sections/$SECTION_ID/start" | jq
```

### Section fetch with user context (should return pinned version)
```bash
curl -s \
  -H "x-user-id: $USER_ID" \
  "http://localhost:3001/v1/sections/$SECTION_ID" | jq
```

### Section fetch without user context (public published version)
```bash
curl -s \
  "http://localhost:3001/v1/sections/$SECTION_ID" | jq
```

### Manual republish simulation (optional, for local verification)
Use SQL/Prisma to swap statuses between v1 and v2 for the seeded section, then compare the two curl results above:
- with header -> stays on pinned old version
- without header -> moves to new published version

(Exact status swap mechanics will be covered by the e2e test and should respect the one-published constraint.)

---

## Assumptions and Defaults
- `user_section_progress` already exists (PR-4) with `UNIQUE(userId, sectionId)` and pinned `sectionVersionId`
- `x-user-id` in content endpoint is optional and not strictly validated for existence (treated as context hint only)
- Archived pinned versions are allowed to be served to preserve learner continuity
- Draft versions are never served unless a future authenticated/admin endpoint explicitly allows it (not in PR-5)
- Existing `SectionDetailDto` payload shape remains stable; only version resolution source changes
