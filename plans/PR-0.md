## PR-0 Scaffold Plan (Turborepo + pnpm, Next.js + NestJS, no DB/auth/features yet)

### 1) Plan Summary

**Repo tree (target)**
```text
/Users/poski/academy
├─ apps
│  ├─ web
│  │  ├─ app
│  │  │  ├─ globals.css
│  │  │  ├─ layout.tsx
│  │  │  └─ page.tsx
│  │  ├─ src/lib
│  │  │  ├─ api.ts
│  │  │  └─ api.test.ts
│  │  ├─ .eslintrc.cjs
│  │  ├─ next.config.ts
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  └─ vitest.config.ts
│  └─ api
│     ├─ src
│     │  ├─ app.module.ts
│     │  ├─ main.ts
│     │  └─ health.controller.ts
│     ├─ test
│     │  └─ health.e2e-spec.ts
│     ├─ .eslintrc.cjs
│     ├─ jest.config.ts
│     ├─ package.json
│     ├─ tsconfig.build.json
│     └─ tsconfig.json
├─ packages
│  ├─ shared
│  │  ├─ src
│  │  │  ├─ constants.ts
│  │  │  └─ index.ts
│  │  ├─ .eslintrc.cjs
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  └─ config
│     ├─ eslint
│     │  ├─ base.cjs
│     │  ├─ nest.cjs
│     │  └─ next.cjs
│     ├─ prettier
│     │  └─ prettier.cjs
│     ├─ tsconfig
│     │  ├─ base.json
│     │  ├─ lib.json
│     │  ├─ nest.json
│     │  └─ next.json
│     └─ package.json
├─ .gitignore
├─ .prettierignore
├─ package.json
├─ pnpm-workspace.yaml
└─ turbo.json
```

**Key decisions**
- Monorepo uses `pnpm` workspaces + `turbo` task graph with root scripts: `dev/build/lint/test/typecheck`.
- `apps/web` is Next.js App Router (TypeScript); homepage renders “Academy MVP” and health status from API.
- `apps/api` is NestJS (TypeScript) with `GET /health -> { "status": "ok" }`.
- `packages/shared` provides shared TS exports (constants + placeholder for future DTO/Zod).
- `packages/config` centralizes ESLint/TS/Prettier configs; all workspace packages extend these.

---

### 2) Exact Commands (from empty `/Users/poski/academy`)

```bash
# 0) Ensure pnpm exists (required on your machine right now)
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm -v

# 1) Root setup
cat > package.json <<'EOF'
{
  "name": "academy",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "dev": "turbo run dev --parallel",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck",
    "format": "prettier --check .",
    "format:write": "prettier --write ."
  },
  "devDependencies": {
    "@types/node": "22.10.1",
    "@typescript-eslint/eslint-plugin": "8.18.1",
    "@typescript-eslint/parser": "8.18.1",
    "eslint": "9.17.0",
    "eslint-config-prettier": "9.1.0",
    "prettier": "3.4.2",
    "turbo": "2.3.3",
    "typescript": "5.7.2"
  }
}
EOF

cat > pnpm-workspace.yaml <<'EOF'
packages:
  - apps/*
  - packages/*
EOF

cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": { "dependsOn": ["^lint"], "outputs": [] },
    "test": { "dependsOn": ["^test"], "outputs": [] },
    "typecheck": { "dependsOn": ["^typecheck"], "outputs": [] }
  }
}
EOF

cat > .gitignore <<'EOF'
node_modules
.pnpm-store
.next
dist
coverage
.env*
EOF

cat > .prettierignore <<'EOF'
node_modules
.next
dist
coverage
EOF

# 2) Create folders
mkdir -p apps/web/app apps/web/src/lib apps/api/src apps/api/test packages/shared/src packages/config/eslint packages/config/tsconfig packages/config/prettier

# 3) Install workspace deps
pnpm install
pnpm add -w -D vitest tsx jest ts-jest supertest @types/jest @types/supertest
pnpm add -F @academy/web next@14.2.20 react@18.3.1 react-dom@18.3.1 zod
pnpm add -F @academy/web -D eslint-config-next@14.2.20 @types/react@18.3.12 @types/react-dom@18.3.1
pnpm add -F @academy/api @nestjs/common@10.4.15 @nestjs/core@10.4.15 @nestjs/platform-express@10.4.15 reflect-metadata rxjs zod
pnpm add -F @academy/shared zod

# 4) Write all files listed in section (3) with exact contents from this plan
# 5) Verify
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

---

### 3) Exact Files to Create/Edit

1. Root:
- `/Users/poski/academy/package.json`
- `/Users/poski/academy/pnpm-workspace.yaml`
- `/Users/poski/academy/turbo.json`
- `/Users/poski/academy/.gitignore`
- `/Users/poski/academy/.prettierignore`

2. Config package:
- `/Users/poski/academy/packages/config/package.json`
- `/Users/poski/academy/packages/config/eslint/base.cjs`
- `/Users/poski/academy/packages/config/eslint/next.cjs`
- `/Users/poski/academy/packages/config/eslint/nest.cjs`
- `/Users/poski/academy/packages/config/prettier/prettier.cjs`
- `/Users/poski/academy/packages/config/tsconfig/base.json`
- `/Users/poski/academy/packages/config/tsconfig/lib.json`
- `/Users/poski/academy/packages/config/tsconfig/next.json`
- `/Users/poski/academy/packages/config/tsconfig/nest.json`

3. Shared package:
- `/Users/poski/academy/packages/shared/package.json`
- `/Users/poski/academy/packages/shared/tsconfig.json`
- `/Users/poski/academy/packages/shared/.eslintrc.cjs`
- `/Users/poski/academy/packages/shared/src/constants.ts`
- `/Users/poski/academy/packages/shared/src/index.ts`

4. API app:
- `/Users/poski/academy/apps/api/package.json`
- `/Users/poski/academy/apps/api/tsconfig.json`
- `/Users/poski/academy/apps/api/tsconfig.build.json`
- `/Users/poski/academy/apps/api/.eslintrc.cjs`
- `/Users/poski/academy/apps/api/jest.config.ts`
- `/Users/poski/academy/apps/api/src/main.ts`
- `/Users/poski/academy/apps/api/src/app.module.ts`
- `/Users/poski/academy/apps/api/src/health.controller.ts`
- `/Users/poski/academy/apps/api/test/health.e2e-spec.ts`

5. Web app:
- `/Users/poski/academy/apps/web/package.json`
- `/Users/poski/academy/apps/web/tsconfig.json`
- `/Users/poski/academy/apps/web/.eslintrc.cjs`
- `/Users/poski/academy/apps/web/next.config.ts`
- `/Users/poski/academy/apps/web/vitest.config.ts`
- `/Users/poski/academy/apps/web/app/layout.tsx`
- `/Users/poski/academy/apps/web/app/globals.css`
- `/Users/poski/academy/apps/web/app/page.tsx`
- `/Users/poski/academy/apps/web/src/lib/api.ts`
- `/Users/poski/academy/apps/web/src/lib/api.test.ts`

6. Required scripts in package manifests:
- Root: `dev/build/lint/test/typecheck`
- API: `dev/build/start/lint/test/typecheck`
- Web: `dev/build/start/lint/test/typecheck`
- Shared: `build/lint/test/typecheck` (test can be placeholder pass command)

---

### 4) Risks / Notes
- Current environment lacks `pnpm`; `corepack` bootstrap step is required first.
- Keep PR-0 strict: no Prisma, no DB models, no auth, no feature modules beyond health check and homepage status fetch.
