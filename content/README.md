# Content Authoring Contract

This directory is the source of truth for creator-authored learning content.

## Directory layout

- `content/templates/` contains copy-ready templates.
- `content/bundles/` contains real lesson files to validate and import.

Recommended structure under `content/bundles/`:

```text
content/bundles/
  <path-slug>/
    <module-slug>/
      <section-slug>.v<version>.md
```

Example:

- `content/bundles/web-pentest-path/http-basics-module/request-response-cycle.v2.md`

## File contract

- One file represents one section version.
- Frontmatter must match the importer schema exactly.
- Required fields:
  - `path_slug`, `path_title`
  - `module_slug`, `module_title`
  - `section_slug`, `section_title`
  - `version_number`
- Optional fields:
  - `path_description`, `path_sort_order`
  - `module_description`, `module_sort_order`
  - `section_sort_order`, `section_has_quiz`
  - `change_log`, `created_by`, `estimated_seconds`

## Naming and versioning rules

- File name format: `<section-slug>.v<version-number>.md`.
- Increase `version_number` for every new draft revision you want to track.
- Keep slugs stable for existing entities; changing a slug creates a different entity.

## Validation commands

From repository root:

```bash
pnpm content:validate
pnpm content:validate:strict
```

- `content:validate` runs importer dry-run against `content/bundles`.
- `content:validate:strict` fails with non-zero exit code on parse/validation errors.
- Both commands are dry-run only and do not write to the database.

## Creator CLI commands

```bash
pnpm content:new -- --path-slug <path> --path-title "..." --module-slug <module> --module-title "..." --section-slug <section> --section-title "..." [--version 1]
pnpm content:import -- [--root content/bundles] [--dry-run] [--json]
pnpm content:preview -- --section-slug <section> [--version <n>] [--no-open]
pnpm content:publish -- --section-slug <section> --version <n> --yes [--confirm <section>@v<n>]
```

The preview/publish lookup path is slug-first and uses admin endpoints:
- `GET /v1/admin/content/sections`
- `GET /v1/admin/content/sections/:sectionSlug/versions`
- `POST /v1/admin/content/publish`

For non-local publish targets, `--confirm <section>@v<n>` is required.
