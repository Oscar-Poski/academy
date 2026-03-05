# Academy

Academy is a learning platform monorepo with a Next.js web app and a NestJS API.

## Overview

- Monorepo tooling: Turborepo + pnpm workspaces
- Frontend: Next.js 14 (`apps/web`)
- Backend: NestJS 10 + Prisma (`apps/api`)
- Database: PostgreSQL
- Shared packages: `packages/shared`, `packages/config`, `packages/content-importer`

## Repository Structure

```text
apps/
  web/                 # Next.js app
  api/                 # NestJS API + Prisma
packages/
  shared/              # Shared types/utilities
  config/              # Shared configuration
  content-importer/    # Markdown content import tooling
plans/
  ADMIN_APP_SUMMARY.md # Consolidated admin summary
```

## Prerequisites

- Node.js 20+
- `corepack` enabled
- `pnpm`
- Docker (for local PostgreSQL)

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Configure API environment:

```bash
cp apps/api/.env.example apps/api/.env
```

3. Start local databases:

```bash
docker compose up -d
docker compose ps
```

4. Run migrations and seed:

```bash
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:seed
```

5. Start development servers:

```bash
pnpm dev
```

Default local URLs:

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:3001](http://localhost:3001)
- Health: [http://localhost:3001/health](http://localhost:3001/health)

## Environment Variables

### Web (`apps/web`)

- `API_BASE_URL` (server-side API origin)
- `NEXT_PUBLIC_API_BASE_URL` (browser API origin)

Defaults to `http://localhost:3001` when unset.

### API (`apps/api`)

- `DATABASE_URL`
- `DATABASE_URL_TEST`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `AUTH_RATE_LIMIT_WINDOW_SECONDS`
- `AUTH_RATE_LIMIT_LOGIN_MAX`
- `AUTH_RATE_LIMIT_REGISTER_MAX`

## Common Commands

### Monorepo

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm web:regression
```

### API

```bash
pnpm --filter @academy/api dev
pnpm --filter @academy/api test
pnpm --filter @academy/api db:migrate
pnpm --filter @academy/api db:seed
pnpm --filter @academy/api db:reset
```

### Web

```bash
pnpm --filter @academy/web dev
pnpm --filter @academy/web test
pnpm --filter @academy/web test:regression
pnpm --filter @academy/web typecheck
```

## Content Creator Quickstart (PR-2)

This flow is for non-dev creators using CLI-only content operations (no admin UI).

1. Create a new lesson draft file:

```bash
pnpm content:new -- --path-slug web-pentest-path --path-title "Web Pentest Path" --module-slug http-basics-module --module-title "HTTP Basics" --section-slug request-response-cycle --section-title "Request and Response Cycle" --version 1
```

2. Edit frontmatter + Markdown body in the generated file under `content/bundles/`.
3. Validate content bundle before import:

```bash
pnpm content:validate
pnpm content:validate:strict
```

4. Import draft content:

```bash
pnpm content:import
```

5. Preview and publish selected version:

```bash
pnpm content:preview -- --section-slug request-response-cycle --version 1 --no-open
pnpm content:publish -- --section-slug request-response-cycle --version 1 --yes
```

Required env for API-backed commands:
- `ACADEMY_API_BASE_URL` (defaults to `http://localhost:3001`)
- one auth option:
  - `ACADEMY_ADMIN_ACCESS_TOKEN`, or
  - `ACADEMY_ADMIN_EMAIL` + `ACADEMY_ADMIN_PASSWORD`

Notes:
- One file is one section version.
- Frontmatter contract details are documented in `content/README.md`.
- `content:publish` is explicit and never auto-runs during import.
- CLI slug resolution now uses admin slug-first endpoints under `/v1/admin/content/*` (no public path crawling).
- for non-local publish targets, use `--confirm <section-slug>@v<n>` in addition to `--yes`.

## Feature Summary

- Auth lifecycle with bearer tokens + rotating refresh tokens
- Cookie-based web session transport
- Learner progress tracking and continue-learning flow
- Quiz delivery, attempts, and scoring
- Unlock engine (`prereq_sections`, `quiz_pass`, `credits`, `min_level`)
- Credits wallet + unlock credit redemption
- Gamification summary + XP/level progression
- Admin content import, section versioning, and publish flow
- Observability baseline (`x-request-id`, structured logs, `/metrics`)

## Documentation

- Admin-facing consolidated summary: `plans/ADMIN_APP_SUMMARY.md`
- Creator operations runbook: `docs/content-ops.md`

## Notes

- Public routes include landing and course discovery.
- Protected learner functionality (for example `/learn/:sectionId`) requires authentication.
- For admin APIs under `/v1/admin/*`, a bearer token with `role=admin` is required.
