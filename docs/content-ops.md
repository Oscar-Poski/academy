# Content Operations Runbook

This runbook covers creator-safe CLI operations for import, preview, and publish.

## Required Environment

- `ACADEMY_API_BASE_URL` (defaults to `http://localhost:3001`)
- One auth strategy:
  - `ACADEMY_ADMIN_ACCESS_TOKEN`, or
  - `ACADEMY_ADMIN_EMAIL` + `ACADEMY_ADMIN_PASSWORD`

## Local Preview Runbook

1. Validate content:

```bash
pnpm content:validate
pnpm content:validate:strict
```

2. Import drafts:

```bash
pnpm content:import
```

3. Generate deterministic preview artifact (without opening browser):

```bash
pnpm content:preview -- --section-slug <section-slug> --version <n> --no-open
```

Preview file path:
- `.tmp/content-preview/<section-slug>.v<n>.html`

4. Optional browser open:

```bash
pnpm content:preview -- --section-slug <section-slug> --version <n>
```

## Publish Runbook

### Local target

```bash
pnpm content:publish -- --section-slug <section-slug> --version <n> --yes
```

### Non-local target (staging/production)

When `ACADEMY_API_BASE_URL` is not localhost/127.0.0.1, confirmation token is mandatory:

```bash
pnpm content:publish -- --section-slug <section-slug> --version <n> --yes --confirm <section-slug>@v<n>
```

## Safety Checklist Before Publish

- Validation strict run passes (`pnpm content:validate:strict`).
- Correct draft version reviewed in preview artifact.
- Target API base URL is expected.
- For non-local targets, `--confirm` token matches slug/version exactly.

## Error Guide

- `Missing admin credentials ...`: set token or email/password env vars.
- `Section slug not found ...`: verify slug exists in imported catalog.
- `Version <n> not found ...`: import did not create that version yet.
- `Version <n> ... is published/archived, expected draft`: choose a draft version.
- `publish_conflict ...`: backend safety checks blocked publish (`target_not_draft`, `empty_lesson_blocks`, `quiz_required_but_missing_questions`).
