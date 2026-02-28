# PR-41 Release Checklist (Observability + Hardening)

## Pre-Deploy
- Confirm branch/tag and changelog notes for PR-41 are complete.
- Confirm rollback owner and on-call contact for deployment window.
- Validate environment variables:
  - `DATABASE_URL`
  - `DATABASE_URL_TEST` (CI/smoke)
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
- Confirm database backup/restore process is available and recent.
- Review migration impact (`prisma migrate status`) and confirm no destructive SQL.

## Deploy
- Apply migrations:
  - `pnpm --filter @academy/api db:migrate`
- Seed baseline data if required by environment policy:
  - `pnpm --filter @academy/api db:seed`
- Start API and run smoke checks:
  - `pnpm release:smoke`
- Verify API health:
  - `GET /health` returns `{ "status": "ok", "db": "ok" }`
- Verify metrics endpoint:
  - `GET /metrics` returns `uptime_seconds`, `generated_at`, and counters object.

## Post-Deploy Validation
- Trigger one invalid login and verify metrics counters increase:
  - `auth_invalid_credentials_total`
  - `auth_failures_total`
- Trigger one bearer failure and verify:
  - `auth_invalid_bearer_total`
- Trigger one gated completion failure and verify:
  - `completion_blocked_total`
- Trigger one unlock-blocked and one insufficient-credits failure and verify:
  - `unlock_blocked_total`
  - `unlock_insufficient_credits_total`
- Verify request logs are JSON lines and include:
  - `request_id`
  - `method`
  - `path`
  - `status_code`
  - `duration_ms`

## Rollback Procedure
- Application rollback:
  - Deploy previous API artifact/container image.
- Database rollback decision:
  - If migrations were non-breaking/no-op: keep schema, rollback app only.
  - If migration rollback is required: run `prisma migrate resolve`/manual rollback plan approved by DB owner.
- After rollback, verify:
  - `GET /health`
  - auth login flow
  - learner progress complete endpoint
  - admin publish endpoint
- Re-run smoke checks and capture results in release notes.
