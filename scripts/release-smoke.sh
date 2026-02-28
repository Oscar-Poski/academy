#!/usr/bin/env bash
set -euo pipefail

echo "[release-smoke] Starting API smoke checks"

if [[ -f "apps/api/.env" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "apps/api/.env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" && -n "${DATABASE_URL_TEST:-}" ]]; then
  export DATABASE_URL="${DATABASE_URL_TEST}"
fi

echo "[release-smoke] Running API typecheck"
pnpm --filter @academy/api typecheck

echo "[release-smoke] Applying test database migrations"
pnpm --filter @academy/api db:migrate

echo "[release-smoke] Seeding test database"
pnpm --filter @academy/api db:seed

echo "[release-smoke] Running targeted API suites"
pnpm --filter @academy/api test -- \
  health.e2e-spec.ts \
  auth.e2e-spec.ts \
  progress-completion-gating.e2e-spec.ts \
  unlock-evaluate.e2e-spec.ts \
  analytics.e2e-spec.ts

echo "[release-smoke] Completed"
