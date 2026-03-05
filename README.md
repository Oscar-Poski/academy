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
- Release checklist: `plans/RELEASE_CHECKLIST_PR41.md`

## Notes

- Public routes include landing and course discovery.
- Protected learner functionality (for example `/learn/:sectionId`) requires authentication.
- For admin APIs under `/v1/admin/*`, a bearer token with `role=admin` is required.
