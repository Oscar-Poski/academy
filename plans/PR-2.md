## PR-2 Plan: Read-Only Content API (apps/api only)

### Summary
Implement a new NestJS `ContentModule` under `apps/api/src/modules/content` that exposes 4 read-only endpoints:

1. `GET /v1/paths`
2. `GET /v1/paths/:pathId`
3. `GET /v1/modules/:moduleId`
4. `GET /v1/sections/:sectionId` (published version only)

No schema changes, no Prisma schema edits, no web changes, no progress/quiz/unlock logic.

---

## 1) Proposed Folder Structure (`apps/api/src/modules/content`)

```txt
apps/api/src/modules/content/
  content.module.ts
  content.controller.ts
  content.service.ts
  dto/
    path-list-item.dto.ts
    path-tree.dto.ts
    module-detail.dto.ts
    section-detail.dto.ts
    index.ts
```

---

## 2) Exact Files To Create/Modify

### Create
- `apps/api/src/modules/content/content.module.ts`
- `apps/api/src/modules/content/content.controller.ts`
- `apps/api/src/modules/content/content.service.ts`
- `apps/api/src/modules/content/dto/path-list-item.dto.ts`
- `apps/api/src/modules/content/dto/path-tree.dto.ts`
- `apps/api/src/modules/content/dto/module-detail.dto.ts`
- `apps/api/src/modules/content/dto/section-detail.dto.ts`
- `apps/api/src/modules/content/dto/index.ts`

### Modify
- `apps/api/src/app.module.ts`  
  Add `ContentModule` import and registration.

No other files modified.

---

## 3) Data Access Strategy

### Endpoint: `GET /v1/paths`
Return path list with `moduleCount` + `sectionCount`:

- Single `prisma.path.findMany` with:
  - ordered by `sortOrder asc`, fallback `createdAt asc`
  - `select`:
    - base fields: `id, slug, title, description`
    - `_count: { select: { modules: true } }`
    - `modules: { select: { _count: { select: { sections: true } } } }`
- Compute `sectionCount` in service by summing `modules[]. _count.sections`.
- Avoid N+1 by fetching all needed counts in one query per path set.

### Endpoint: `GET /v1/paths/:pathId`
Return full tree (path -> modules -> sections), ordered:

- `prisma.path.findUnique` by `id`
- `select` path metadata + `modules` relation:
  - `modules.orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]`
  - `modules.select` minimal metadata + nested `sections`
  - `sections.orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]`
  - `sections.select` minimal metadata only
- If not found: throw `NotFoundException`.

### Endpoint: `GET /v1/modules/:moduleId`
Return module + ordered sections:

- `prisma.module.findUnique` by `id`
- `select` module metadata + `sections` ordered by `sortOrder asc`, then `createdAt asc`
- If not found: throw `NotFoundException`.

### Endpoint: `GET /v1/sections/:sectionId`
Resolve published version only + blocks + navigation:

- Query section with module/path context and published version only:
  - `prisma.section.findUnique`
  - include `sectionVersions` filtered by `status: 'published'`, `take: 1`
  - nested `lessonBlocks` ordered by `blockOrder asc`
- If section not found: `NotFoundException`
- If section exists but no published version: `NotFoundException` with clear message (“No published version for section”)
- Build navigation by fetching sibling sections in same module:
  - `prisma.section.findMany({ where: { moduleId }, orderBy: sortOrder asc, createdAt asc, select: { id } })`
  - compute current index in memory
  - `prevSectionId` and `nextSectionId` from adjacent items
- Return section metadata + `sectionVersionId` + ordered `lessonBlocks` + `navigation`.

Published visibility rule: only `status = published` is exposed in public section endpoint.

---

## 4) DTO Shapes (High-Level Interfaces)

```ts
// GET /v1/paths
interface PathListItemDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  moduleCount: number;
  sectionCount: number;
}

// GET /v1/paths/:pathId
interface PathTreeSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}
interface PathTreeModuleDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  sections: PathTreeSectionDto[];
}
interface PathTreeDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  modules: PathTreeModuleDto[];
}

// GET /v1/modules/:moduleId
interface ModuleDetailSectionDto {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}
interface ModuleDetailDto {
  id: string;
  pathId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  sections: ModuleDetailSectionDto[];
}

// GET /v1/sections/:sectionId
interface SectionLessonBlockDto {
  id: string;
  blockOrder: number;
  blockType: 'markdown' | 'callout' | 'code' | 'quiz' | 'checklist';
  contentJson: unknown;
  estimatedSeconds: number | null;
}
interface SectionNavigationDto {
  prevSectionId: string | null;
  nextSectionId: string | null;
}
interface SectionDetailDto {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  sortOrder: number;
  sectionVersionId: string;
  lessonBlocks: SectionLessonBlockDto[];
  navigation: SectionNavigationDto;
}
```

---

## 5) Navigation Strategy (No progress tables)

Navigation is module-local static ordering:

1. Find all sections in current section’s `moduleId`.
2. Order by `sortOrder asc`, tie-breaker `createdAt asc`.
3. Locate current section in ordered list.
4. `prevSectionId` = previous item or `null`.
5. `nextSectionId` = next item or `null`.

This intentionally ignores lock/unlock/progress (placeholder behavior for PR-2).

---

## 6) Risks / Edge Cases and Handling

1. **Section exists but has no published version**
- Return `404` (or `409`, but plan uses `404`) with explicit reason.
- Prevents draft leakage.

2. **Empty path/module**
- Path with zero modules returns `modules: []`.
- Module with zero sections returns `sections: []`.

3. **Ordering ambiguity**
- Use stable ordering: `sortOrder asc`, `createdAt asc` tie-breaker.

4. **Orphan/missing relations**
- Prisma relations + FK constraints should prevent most cases.
- If inconsistency encountered, service throws `NotFoundException`.

5. **N+1 risk**
- Use nested `select/include` for tree endpoints.
- For section navigation, one extra sibling query only.

---

## 7) Manual Verification Steps (after implementation)

### Start API
```bash
pnpm --filter @academy/api dev
```

### Check endpoints

1. List paths
```bash
curl -s http://localhost:3001/v1/paths | jq
```
Expected shape:
```json
[
  {
    "id": "string",
    "slug": "string",
    "title": "string",
    "description": "string|null",
    "moduleCount": 1,
    "sectionCount": 2
  }
]
```

2. Path tree
```bash
curl -s http://localhost:3001/v1/paths/<PATH_ID> | jq
```
Expected shape:
```json
{
  "id": "string",
  "slug": "string",
  "title": "string",
  "description": "string|null",
  "modules": [
    {
      "id": "string",
      "slug": "string",
      "title": "string",
      "sortOrder": 1,
      "sections": [
        {
          "id": "string",
          "slug": "string",
          "title": "string",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

3. Module detail
```bash
curl -s http://localhost:3001/v1/modules/<MODULE_ID> | jq
```
Expected shape:
```json
{
  "id": "string",
  "pathId": "string",
  "slug": "string",
  "title": "string",
  "description": "string|null",
  "sortOrder": 1,
  "sections": [
    {
      "id": "string",
      "slug": "string",
      "title": "string",
      "sortOrder": 1
    }
  ]
}
```

4. Section detail (published only)
```bash
curl -s http://localhost:3001/v1/sections/<SECTION_ID> | jq
```
Expected shape:
```json
{
  "id": "string",
  "moduleId": "string",
  "slug": "string",
  "title": "string",
  "sortOrder": 1,
  "sectionVersionId": "string",
  "lessonBlocks": [
    {
      "id": "string",
      "blockOrder": 1,
      "blockType": "markdown",
      "contentJson": {},
      "estimatedSeconds": 90
    }
  ],
  "navigation": {
    "prevSectionId": "string|null",
    "nextSectionId": "string|null"
  }
}
```

5. Not-found behavior
```bash
curl -i http://localhost:3001/v1/sections/not-a-real-id
```
Expected: HTTP `404`.

---

## Assumptions and Defaults
- IDs supplied in path params are Prisma IDs (`cuid`), not slugs.
- Public content endpoints are unauthenticated for PR-2.
- Status filtering for `paths/modules/sections` entities is not introduced yet (only section version publish filtering is enforced).
- Lock status is not implemented; navigation returns only prev/next IDs.
