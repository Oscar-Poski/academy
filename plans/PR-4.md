## PR-4 Plan: Backend Progress Tracking + Minimal Resume/Continue Web Wiring

### Summary
Add authoritative progress tracking in `apps/api` (temporary user strategy, progress table + REST endpoints + tests) and minimal web integration in `apps/web` for:

- start section progress on `/learn/[sectionId]` page load
- “Continue learning” card on homepage powered by backend `/v1/progress/continue`

No auth, no quizzes/unlocks/XP, no Prisma content schema changes, no web config changes.

---

## 1) Exact Files To Create / Modify

### API (`apps/api/**`)

#### Create
- `apps/api/src/modules/progress/progress.module.ts`
- `apps/api/src/modules/progress/progress.controller.ts`
- `apps/api/src/modules/progress/progress.service.ts`
- `apps/api/src/modules/progress/dto/index.ts`
- `apps/api/src/modules/progress/dto/section-progress.dto.ts`
- `apps/api/src/modules/progress/dto/update-section-position.dto.ts`
- `apps/api/src/modules/progress/dto/module-progress.dto.ts`
- `apps/api/src/modules/progress/dto/path-progress.dto.ts`
- `apps/api/src/modules/progress/dto/continue-learning.dto.ts`
- `apps/api/test/progress.e2e-spec.ts`

#### Modify
- `apps/api/prisma/schema.prisma` (add progress enum/model only)
- `apps/api/prisma/migrations/<timestamp>_add_user_section_progress/migration.sql` (generated; may be amended for DB checks/indexes)
- `apps/api/src/app.module.ts` (import `ProgressModule`)
- `apps/api/prisma/seed.ts` (optional only if needed for deterministic test helper user; preferred: no seed change)
- `apps/api/test/content.e2e-spec.ts` (only if shared helper extraction is useful; otherwise no change)
- `apps/api/test/setup-env.ts` (no behavior change expected; keep strict `DATABASE_URL_TEST`)

### Web (`apps/web/**`)

#### Create
- `apps/web/src/lib/api-clients/progress.client.ts`
- `apps/web/src/lib/temp-user.ts` (temporary user header source for web -> API calls)
- `apps/web/src/lib/progress-types.ts` (local response/request types for progress API)

#### Modify
- `apps/web/app/page.tsx` (add “Continue learning” card)
- `apps/web/app/learn/[sectionId]/page.tsx` (call `start` endpoint on page load, server-side)
- `apps/web/app/globals.css` (minimal styles for continue card only, using semantic classnames)

No changes to:
- `apps/web/next.config.mjs`
- `apps/web/tsconfig.json`
- `apps/api/src/modules/content/**` (unless strictly needed for imports; preferred no changes)

---

## 2) Migration Needed: Prisma Schema Changes + Notes

### Current state (confirmed)
`apps/api/prisma/schema.prisma` currently has no progress tables.

### Additions to Prisma schema

#### New enum
`ProgressStatus`:
- `not_started`
- `in_progress`
- `completed`

#### New model
`UserSectionProgress` mapped to `user_section_progress` with fields:
- `id String @id @default(cuid())`
- `userId String @map("user_id")`
- `sectionId String @map("section_id")`
- `sectionVersionId String @map("section_version_id")`
- `status ProgressStatus @default(not_started)`
- `startedAt DateTime? @map("started_at")`
- `lastSeenAt DateTime? @map("last_seen_at")`
- `completedAt DateTime? @map("completed_at")`
- `completionPct Int @default(0) @map("completion_pct")`
- `lastBlockOrder Int? @map("last_block_order")`
- `timeSpentSeconds Int @default(0) @map("time_spent_seconds")`
- `createdAt DateTime @default(now()) @map("created_at")`
- `updatedAt DateTime @updatedAt @map("updated_at")`

Relations:
- `user -> users.id`
- `section -> sections.id`
- `sectionVersion -> section_versions.id`

Indexes/constraints:
- `@@unique([userId, sectionId])`
- `@@index([userId, status, lastSeenAt])` (for continue lookup)
- `@@index([sectionId])`
- `@@index([sectionVersionId])`

### Uniqueness choice (and versioning justification)
Use `UNIQUE(user_id, section_id)` (not triple).

Reason:
- Single authoritative progress row per user+section.
- `section_version_id` is pinned on first start and preserved on subsequent calls.
- Future explicit migration logic can update the pinned version in-place (admin-controlled), instead of creating multiple concurrent rows per section.

### Aggregates choice (MVP)
Do **not** add cached aggregate tables (`user_module_progress`, `user_path_progress`) in PR-4.

Reason:
- Minimal/incremental change.
- Aggregates can be computed on the fly with current content + `user_section_progress`.
- Avoids write-time cache invalidation complexity before quizzes/unlocks/gamification exist.

### Migration notes / commands
- Run Prisma migration for dev:
  - `pnpm --filter @academy/api db:migrate`
- Prisma client regenerate occurs via migrate scripts / explicit generate if needed.
- Apply to test DB before tests (existing workflow):
  - `DATABASE_URL=<test_db> pnpm --filter @academy/api prisma migrate deploy`

Optional DB hardening (only if low-friction in generated SQL):
- Add check constraint for `completion_pct BETWEEN 0 AND 100`
- Add check for `time_spent_seconds >= 0`
If omitted, enforce in service via clamping.

---

## 3) Temporary User Strategy (Standardized)

### Choice
Use header: `x-user-id` (standardized across all progress endpoints).

### Why header (vs query param)
- Keeps URLs cacheable/clean and not user-variant by query string.
- Closer to future auth extraction from request context.
- Easy to send from web server-side fetches.

### Temporary behavior (MVP)
- Progress endpoints require `x-user-id`.
- Service resolves/auto-provisions a temporary `users` row if that ID does not exist:
  - `users.id = x-user-id` (explicitly provided)
  - synthetic placeholder email (deterministic + sanitized)
  - placeholder name (e.g., `Temp User`)
- Add TODO comments in API and web:
  - replace temp header strategy with JWT-authenticated user context

This avoids requiring the frontend to know a seeded DB user ID.

---

## 4) Progress API Endpoints: Request / Response Shapes (DTOs)

### Shared response DTO for section progress
```ts
type SectionProgressStatus = 'not_started' | 'in_progress' | 'completed';

interface SectionProgressDto {
  id: string;
  userId: string;
  sectionId: string;
  sectionVersionId: string;
  status: SectionProgressStatus;
  startedAt: string | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  completionPct: number;
  lastBlockOrder: number | null;
  timeSpentSeconds: number;
}
```

### 1) `POST /v1/progress/sections/:sectionId/start`
Request:
- Header: `x-user-id: string`
- No body

Behavior:
- If progress row exists for user+section: return it (pin preserved)
- Else:
  - resolve current published section version
  - create progress row with pinned `sectionVersionId`
  - status `in_progress`
  - `startedAt`/`lastSeenAt` set now
  - `completionPct = 0`

Response:
```ts
type StartSectionProgressResponseDto = SectionProgressDto;
```

### 2) `PATCH /v1/progress/sections/:sectionId/position`
Request:
- Header: `x-user-id: string`
- Body:
```ts
interface UpdateSectionPositionDto {
  last_block_order: number;
  time_spent_delta: number;
  completion_pct?: number;
}
```

Behavior (MVP-safe + monotonic):
- Ensure progress row exists (create/start if missing by reusing start logic)
- Update:
  - `lastSeenAt = now`
  - `lastBlockOrder = max(existing,last_block_order)` (monotonic)
  - `timeSpentSeconds += max(0,time_spent_delta)` (basic retry-safe, but not fully idempotent without event IDs)
  - `completionPct = clamp(max(existing, completion_pct ?? existing), 0, 100)`
  - If already completed, keep `completedAt` unchanged and status `completed`
- Return updated progress

Response:
```ts
type UpdateSectionPositionResponseDto = SectionProgressDto;
```

### 3) `POST /v1/progress/sections/:sectionId/complete`
Request:
- Header: `x-user-id: string`
- No body

Behavior:
- Ensure progress row exists (create/start if missing)
- Idempotent:
  - if already completed: return existing row unchanged (especially preserve `completedAt`)
  - else set:
    - `status = completed`
    - `completionPct = 100`
    - `completedAt = now`
    - `lastSeenAt = now`

Response:
```ts
type CompleteSectionProgressResponseDto = SectionProgressDto;
```

### 4) `GET /v1/progress/modules/:moduleId`
Request:
- Header: `x-user-id: string`

Response:
```ts
interface ModuleSectionProgressItemDto {
  sectionId: string;
  status: SectionProgressStatus;
  completionPct: number;
  lastBlockOrder: number | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  sectionVersionId: string | null; // null when no row yet
}

interface ModuleProgressDto {
  moduleId: string;
  completionPct: number; // completed sections / total sections * 100 rounded down (or nearest; choose one and document)
  completedSections: number;
  totalSections: number;
  sections: ModuleSectionProgressItemDto[];
}
```

### 5) `GET /v1/progress/paths/:pathId`
Request:
- Header: `x-user-id: string`

Response:
```ts
interface PathModuleProgressItemDto {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
}

interface PathProgressDto {
  pathId: string;
  completionPct: number;
  completedModules: number;
  totalModules: number;
  modules: PathModuleProgressItemDto[];
}
```

### 6) `GET /v1/progress/continue`
Request:
- Header: `x-user-id: string`

Response (UI-friendly, so homepage can render card without extra fetches):
```ts
interface ContinueLearningDto {
  source: 'resume' | 'fallback';
  sectionId: string;
  moduleId: string;
  pathId: string;
  sectionTitle: string;
  moduleTitle: string;
  pathTitle: string;
  lastSeenAt: string | null;
}
```

Behavior:
- `resume`: most recently `in_progress` row by `lastSeenAt desc`, then stable tie-breakers
- `fallback`: first section of first module of first path (by `sortOrder`, `createdAt`, `id`)

---

## 5) Version Pinning Logic (Clear / Authoritative)

### Core rule
Once a user starts a section, `user_section_progress.section_version_id` is pinned and reused for all subsequent progress mutations on that section.

### Start endpoint pinning flow
1. Resolve temp user from `x-user-id`
2. Look up `user_section_progress` by `(userId, sectionId)`
3. If row exists:
   - return existing row as-is (do not overwrite `sectionVersionId`)
4. If no row:
   - resolve current published `section_version`
   - create row with that `sectionVersionId`
   - status `in_progress`

### Position and complete endpoints
- Read by `(userId, sectionId)`
- If row exists, update only progress fields
- Never mutate pinned `sectionVersionId`
- If row absent, call same start resolver path first

### Important limitation (PR-4)
Content API (`GET /v1/sections/:sectionId`) still returns current published version only (PR-2 behavior). Progress pinning is authoritative in backend state, but UI content is not yet version-pinned per user until a version-specific content endpoint exists (future PR).

---

## 6) Data Access Strategy (API)

### Progress writes
Use Prisma transactions for multi-step operations where needed:
- start/create flow (resolve section + published version + upsert/create)
- position updates when “ensure row then update”
- complete “ensure row then complete idempotently”

### Module progress query (computed on the fly)
- Fetch module sections ordered (for stable output)
- Fetch all user progress rows for those section IDs in one query
- Build section status map in memory
- Compute counts and completion percentage

### Path progress query (computed on the fly)
- Fetch path -> modules -> sections (ordered) in one nested query
- Fetch all user progress rows for all section IDs in path in one query
- Compute per-module and overall percentages in memory
- No N+1 loops against DB

### Continue query
- Query `user_section_progress` for `userId` + `status=in_progress`
  - order by `lastSeenAt desc`, `updatedAt desc`, `id asc`
  - include section -> module -> path titles/ids
- If none:
  - query first path/module/section via nested ordered selects

---

## 7) API Module Structure (ProgressModule)

Proposed folder structure:
```txt
apps/api/src/modules/progress/
  progress.module.ts
  progress.controller.ts
  progress.service.ts
  dto/
    continue-learning.dto.ts
    module-progress.dto.ts
    path-progress.dto.ts
    section-progress.dto.ts
    update-section-position.dto.ts
    index.ts
```

Controller responsibilities:
- parse `sectionId`, `moduleId`, `pathId`
- extract `x-user-id` header
- delegate to service
- no business logic

Service responsibilities:
- temporary user resolve/provision
- section version pinning
- progress mutations
- aggregate calculations
- continue fallback logic

---

## 8) Web Wiring Steps (Minimal UI Changes)

### Temporary web user source
Create `apps/web/src/lib/temp-user.ts`:
- exports a deterministic temp user ID string (e.g. `'demo-user-1'`)
- optional env override:
  - `NEXT_PUBLIC_TEMP_USER_ID` (fallback to `'demo-user-1'`)
- TODO comment to replace with auth session/JWT-derived user ID

### Progress API client (server-side fetch helpers)
Create `apps/web/src/lib/api-clients/progress.client.ts`:
- `startSectionProgress(sectionId: string)`
- `getContinueLearning()`
- (optional for future use) `updateSectionPosition(...)`, `completeSection(...)`
- All requests send header `x-user-id`

### `/learn/[sectionId]/page.tsx` changes
Current PR-3 flow:
- fetch section
- fetch module
- fetch path

PR-4 update (minimal):
1. Fetch section first (keep current sequence)
2. After section returns, run in parallel:
   - `getModule(section.moduleId)`
   - `startSectionProgress(section.id)` (best-effort; catch/logless non-blocking failure and still render content)
3. Fetch path using `module.pathId`
4. Render player as before

This satisfies “call start endpoint on page load” with server-side invocation and minimal client complexity.

### `apps/web/app/page.tsx` changes (Continue card)
- Keep existing health check UI
- Add call to `getContinueLearning()` (server component fetch)
- Render a “Continue learning” card linking to `/learn/:sectionId`
- If progress endpoint fails (API down / no fallback available unexpectedly), render graceful fallback text (do not break homepage)

### Position updates (explicit MVP choice)
- Do **not** implement nav-click position patches in PR-4 to keep scope minimal and avoid converting player nav buttons into client components.
- Backend endpoints will exist and be tested.
- Add TODO in `PlayerContent` or progress client for nav-click patching in future PR.

---

## 9) Tests (API e2e / Integration)

Create `apps/api/test/progress.e2e-spec.ts` covering required flows, using `DATABASE_URL_TEST` (existing strict setup already enforces this).

### Test setup strategy
- Use `PrismaClient` in test file to query seeded content IDs by slug:
  - section slug `request-response-cycle`
  - module slug `http-basics-module`
  - path slug `web-pentest-path`
- Use unique temporary user headers per test (e.g. `x-user-id: progress-e2e-<case>`) to avoid cross-test interference.
- Because progress service auto-provisions users, no seeded user dependency required.

### Required test cases
1. **start -> position -> complete happy path**
- POST start
- PATCH position (`last_block_order`, `time_spent_delta`, `completion_pct`)
- POST complete
- Assert status transitions and final `completionPct = 100`

2. **idempotent complete**
- Call complete twice
- Assert same `sectionVersionId`
- Assert `completedAt` unchanged between responses
- Assert `timeSpentSeconds` not incremented by complete calls

3. **version pinning**
- Call start twice for same user+section
- Assert same `sectionVersionId`
- Assert only one progress row exists for `(userId, sectionId)`

4. **continue endpoint**
- For user with in-progress row updated recently:
  - assert `/v1/progress/continue` returns `source = resume` and expected `sectionId`
- For fresh user with no progress:
  - assert fallback `source = fallback` and seeded first section IDs/titles

### Optional but useful test
- `GET /v1/progress/modules/:moduleId` after completing one section returns expected per-section statuses and computed percentage.

---

## 10) Verification Steps (Manual)

### 0) Ensure DB and seed are ready
```bash
docker compose up -d
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:seed
```

### 1) Run API tests
```bash
export DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5433/academy_test?schema=public"
pnpm --filter @academy/api test
```

### 2) Run API server
```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/academy_dev?schema=public"
pnpm --filter @academy/api dev
```

### 3) Progress endpoint curl examples (with temp user header)
Set a temp user:
```bash
USER_ID="demo-user-1"
```

Get IDs:
```bash
PATH_ID=$(curl -s http://localhost:3001/v1/paths | jq -r '.[0].id')
MODULE_ID=$(curl -s http://localhost:3001/v1/paths/$PATH_ID | jq -r '.modules[0].id')
SECTION_ID=$(curl -s http://localhost:3001/v1/modules/$MODULE_ID | jq -r '.sections[0].id')
```

Start:
```bash
curl -s -X POST \
  -H "x-user-id: $USER_ID" \
  http://localhost:3001/v1/progress/sections/$SECTION_ID/start | jq
```

Position:
```bash
curl -s -X PATCH \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"last_block_order":2,"time_spent_delta":30,"completion_pct":60}' \
  http://localhost:3001/v1/progress/sections/$SECTION_ID/position | jq
```

Complete:
```bash
curl -s -X POST \
  -H "x-user-id: $USER_ID" \
  http://localhost:3001/v1/progress/sections/$SECTION_ID/complete | jq
```

Module progress:
```bash
curl -s -H "x-user-id: $USER_ID" \
  http://localhost:3001/v1/progress/modules/$MODULE_ID | jq
```

Path progress:
```bash
curl -s -H "x-user-id: $USER_ID" \
  http://localhost:3001/v1/progress/paths/$PATH_ID | jq
```

Continue:
```bash
curl -s -H "x-user-id: $USER_ID" \
  http://localhost:3001/v1/progress/continue | jq
```

### 4) Web verification
```bash
pnpm --filter @academy/web dev
```

Open:
- `http://localhost:3000/` (should show Continue card linked to `/learn/:sectionId`)
- `http://localhost:3000/learn/$SECTION_ID` (should load player and implicitly call `start` server-side)

---

## Assumptions and Defaults
- Temporary user IDs are arbitrary strings sent in `x-user-id`; API auto-provisions matching `users` rows for MVP.
- Existing PR-2 content API and PR-3 UI routes remain unchanged except minimal integrations.
- Continue fallback assumes seeded content exists (1 path, 1 module, >=1 section).
- Progress percentages are computed on the fly in PR-4 (no cached aggregate tables yet).
- Content version pinning is stored in progress rows, but UI content still uses current published content endpoint until a user-version-aware content endpoint is added later.
