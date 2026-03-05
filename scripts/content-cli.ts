import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

export type CliDeps = {
  fetchImpl: typeof fetch;
  openBrowser: (target: string) => Promise<void>;
  runImporterValidate: (input: { root: string; strict: boolean }) => Promise<number>;
  cwd: () => string;
  now: () => Date;
  stdout: (message: string) => void;
  stderr: (message: string) => void;
};

type CommandName = 'new' | 'validate' | 'import' | 'preview' | 'publish';

type ParsedCli = {
  command: CommandName;
  args: Record<string, string | boolean>;
};

type AdminSectionVersionSummary = {
  id: string;
  sectionId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  blockCount: number;
};

type AdminSectionVersionDetail = {
  id: string;
  sectionId: string;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  lessonBlocks: Array<{
    id: string;
    blockOrder: number;
    blockType: string;
    contentJson: unknown;
    estimatedSeconds: number | null;
  }>;
};

type AdminContentSectionCatalogItem = {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  moduleId: string;
  moduleSlug: string;
  moduleTitle: string;
  sectionId: string;
  sectionSlug: string;
  sectionTitle: string;
  hasQuiz: boolean;
};

type ImportContentResult = {
  mode: 'dry_run' | 'apply';
  parseReport: {
    errorCount: number;
    warningCount: number;
  };
  validationSummary?: {
    errorCount: number;
    warningCount: number;
  };
  applied: boolean;
  abortedReason: 'parse_errors' | null;
  counts: {
    pathsCreated: number;
    pathsUpdated: number;
    modulesCreated: number;
    modulesUpdated: number;
    sectionsCreated: number;
    sectionsUpdated: number;
    sectionVersionsCreated: number;
    sectionVersionsUpdated: number;
  };
};

type PublishResponse = {
  sectionId: string;
  versionId: string;
  versionNumber: number;
  status: 'published';
  publishedAt: string;
  archivedVersionIds: string[];
};

type SectionContext = {
  pathId: string;
  pathSlug: string;
  moduleId: string;
  moduleSlug: string;
  sectionId: string;
  sectionSlug: string;
};

type PreviewPageInput = {
  section: SectionContext;
  version: AdminSectionVersionDetail;
  generatedAtIso: string;
};

export async function runCli(argv: string[], deps: CliDeps = defaultDeps()): Promise<number> {
  let parsed: ParsedCli;
  try {
    parsed = parseCli(argv);
  } catch (error) {
    deps.stderr(`${getErrorMessage(error)}\n`);
    deps.stderr(`${usage()}\n`);
    return 1;
  }

  try {
    switch (parsed.command) {
      case 'new':
        return await runNewCommand(parsed.args, deps);
      case 'validate':
        return await runValidateCommand(parsed.args, deps);
      case 'import':
        return await runImportCommand(parsed.args, deps);
      case 'preview':
        return await runPreviewCommand(parsed.args, deps);
      case 'publish':
        return await runPublishCommand(parsed.args, deps);
      default:
        deps.stderr(`Unknown command: ${String(parsed.command)}\n`);
        return 1;
    }
  } catch (error) {
    deps.stderr(`Error: ${getErrorMessage(error)}\n`);
    return 1;
  }
}

export function parseCli(argv: string[]): ParsedCli {
  const [maybeCommand, ...rest] = argv;
  if (!maybeCommand) {
    throw new Error('Missing command.');
  }

  if (!isCommandName(maybeCommand)) {
    throw new Error(`Unsupported command: ${maybeCommand}`);
  }

  return {
    command: maybeCommand,
    args: parseFlags(rest)
  };
}

function isCommandName(value: string): value is CommandName {
  return value === 'new' || value === 'validate' || value === 'import' || value === 'preview' || value === 'publish';
}

export function parseFlags(input: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};

  for (let index = 0; index < input.length; index += 1) {
    const token = input[index];

    if (token === '--') {
      continue;
    }

    if (!token.startsWith('--')) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    const withNoPrefix = token.slice(2);
    const [rawKey, rawValue] = withNoPrefix.split('=', 2);

    if (!rawKey || rawKey.trim().length === 0) {
      throw new Error(`Invalid flag: ${token}`);
    }

    if (typeof rawValue === 'string') {
      args[rawKey] = rawValue;
      continue;
    }

    const next = input[index + 1];
    if (next && !next.startsWith('--')) {
      args[rawKey] = next;
      index += 1;
    } else {
      args[rawKey] = true;
    }
  }

  return args;
}

async function runNewCommand(args: Record<string, string | boolean>, deps: CliDeps): Promise<number> {
  const pathSlug = requireStringArg(args, 'path-slug');
  const pathTitle = requireStringArg(args, 'path-title');
  const moduleSlug = requireStringArg(args, 'module-slug');
  const moduleTitle = requireStringArg(args, 'module-title');
  const sectionSlug = requireStringArg(args, 'section-slug');
  const sectionTitle = requireStringArg(args, 'section-title');
  const version = parsePositiveIntegerArg(args, 'version', 1);

  const filePath = path.join(
    deps.cwd(),
    'content',
    'bundles',
    pathSlug,
    moduleSlug,
    `${sectionSlug}.v${version}.md`
  );

  const frontmatter = buildLessonFrontmatter({
    pathSlug,
    pathTitle,
    moduleSlug,
    moduleTitle,
    sectionSlug,
    sectionTitle,
    versionNumber: version
  });

  await mkdir(path.dirname(filePath), { recursive: true });
  const existing = await safeReadFile(filePath);
  if (existing !== null) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}`);
  }

  await writeFile(filePath, `${frontmatter}\n# ${sectionTitle}\n\nWrite your lesson content in Markdown here.\n`, 'utf8');
  deps.stdout(`Created lesson draft file:\n${filePath}\n`);
  return 0;
}

export function buildLessonFrontmatter(input: {
  pathSlug: string;
  pathTitle: string;
  moduleSlug: string;
  moduleTitle: string;
  sectionSlug: string;
  sectionTitle: string;
  versionNumber: number;
}): string {
  return [
    '---',
    `path_slug: ${input.pathSlug}`,
    `path_title: ${input.pathTitle}`,
    'path_description: Optional path description',
    'path_sort_order: 1',
    `module_slug: ${input.moduleSlug}`,
    `module_title: ${input.moduleTitle}`,
    'module_description: Optional module description',
    'module_sort_order: 1',
    `section_slug: ${input.sectionSlug}`,
    `section_title: ${input.sectionTitle}`,
    'section_sort_order: 1',
    'section_has_quiz: false',
    `version_number: ${input.versionNumber}`,
    'change_log: Initial draft',
    'created_by: content-team',
    'estimated_seconds: 300',
    '---',
    ''
  ].join('\n');
}

async function runValidateCommand(args: Record<string, string | boolean>, deps: CliDeps): Promise<number> {
  const rootArg = optionalStringArg(args, 'root');
  const strict = Boolean(args['strict']);
  const root = path.resolve(deps.cwd(), rootArg ?? 'content/bundles');
  return deps.runImporterValidate({ root, strict });
}

async function runImportCommand(args: Record<string, string | boolean>, deps: CliDeps): Promise<number> {
  const rootArg = optionalStringArg(args, 'root');
  const dryRun = Boolean(args['dry-run']);
  const jsonOutput = Boolean(args['json']);
  const mode = dryRun ? 'dryRun' : 'apply';
  const root = path.resolve(deps.cwd(), rootArg ?? 'content/bundles');

  const apiBase = getApiBaseUrl();
  const token = await getAdminAccessToken({ apiBase, fetchImpl: deps.fetchImpl });
  const result = await apiRequest<ImportContentResult>(
    `${apiBase}/v1/admin/content/import`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        bundle_path: root,
        mode
      })
    },
    deps.fetchImpl
  );

  if (jsonOutput) {
    deps.stdout(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    deps.stdout(`${summarizeImportResult(result)}\n`);
  }

  const parseErrors = result.parseReport.errorCount > 0;
  if (dryRun) {
    return parseErrors ? 1 : 0;
  }

  return parseErrors || result.applied === false || result.abortedReason !== null ? 1 : 0;
}

function summarizeImportResult(result: ImportContentResult): string {
  const validation = result.validationSummary ?? {
    errorCount: result.parseReport.errorCount,
    warningCount: result.parseReport.warningCount
  };

  return [
    `Mode: ${result.mode}`,
    `Applied: ${result.applied}`,
    `Aborted reason: ${result.abortedReason ?? 'none'}`,
    `Validation: errors=${validation.errorCount}, warnings=${validation.warningCount}`,
    `Paths: created=${result.counts.pathsCreated}, updated=${result.counts.pathsUpdated}`,
    `Modules: created=${result.counts.modulesCreated}, updated=${result.counts.modulesUpdated}`,
    `Sections: created=${result.counts.sectionsCreated}, updated=${result.counts.sectionsUpdated}`,
    `Section versions: created=${result.counts.sectionVersionsCreated}, updated=${result.counts.sectionVersionsUpdated}`
  ].join('\n');
}

async function runPreviewCommand(args: Record<string, string | boolean>, deps: CliDeps): Promise<number> {
  const sectionSlug = requireStringArg(args, 'section-slug');
  const requestedVersion = parseOptionalPositiveIntegerArg(args, 'version');
  const noOpen = Boolean(args['no-open']);
  const apiBase = getApiBaseUrl();
  const token = await getAdminAccessToken({ apiBase, fetchImpl: deps.fetchImpl });
  const section = await resolveSectionContextBySlug(apiBase, sectionSlug, token, deps.fetchImpl);

  const versions = await apiRequest<AdminSectionVersionSummary[]>(
    `${apiBase}/v1/admin/content/sections/${section.sectionSlug}/versions`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    deps.fetchImpl
  );

  const target = selectVersionForPreview(versions, requestedVersion);
  const detail = await apiRequest<AdminSectionVersionDetail>(
    `${apiBase}/v1/admin/sections/${section.sectionId}/versions/${target.id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    deps.fetchImpl
  );

  if (detail.lessonBlocks.length === 0) {
    throw new Error(`Section ${section.sectionSlug} v${detail.versionNumber} has zero lesson blocks.`);
  }

  const html = renderPreviewHtml({
    section,
    version: detail,
    generatedAtIso: deps.now().toISOString()
  });

  const previewDir = path.join(deps.cwd(), '.tmp', 'content-preview');
  const previewFile = path.join(previewDir, `${section.sectionSlug}.v${detail.versionNumber}.html`);
  await mkdir(previewDir, { recursive: true });
  await writeFile(previewFile, html, 'utf8');

  if (!noOpen) {
    await deps.openBrowser(previewFile);
  }

  deps.stdout(
    [
      `Preview ready for ${section.sectionSlug} v${detail.versionNumber} (${detail.status})`,
      `Path: ${section.pathSlug}`,
      `Module: ${section.moduleSlug}`,
      `Section: ${section.sectionSlug}`,
      `File: ${previewFile}`,
      `Browser opened: ${noOpen ? 'no (--no-open)' : 'yes'}`
    ].join('\n') + '\n'
  );

  return 0;
}

export function selectVersionForPreview(
  versions: AdminSectionVersionSummary[],
  requestedVersion: number | null
): AdminSectionVersionSummary {
  if (versions.length === 0) {
    throw new Error('No section versions found. Import content first.');
  }

  if (requestedVersion !== null) {
    const version = versions.find((item) => item.versionNumber === requestedVersion);
    if (!version) {
      throw new Error(`Version ${requestedVersion} not found for section.`);
    }

    return version;
  }

  const latestDraft = versions.find((item) => item.status === 'draft');
  if (!latestDraft) {
    throw new Error('No draft version available. Pass --version to preview another version.');
  }

  return latestDraft;
}

async function runPublishCommand(args: Record<string, string | boolean>, deps: CliDeps): Promise<number> {
  const sectionSlug = requireStringArg(args, 'section-slug');
  const versionNumber = parsePositiveIntegerArg(args, 'version');
  const confirmed = Boolean(args['yes']);

  if (!confirmed) {
    throw new Error('Publish requires explicit confirmation. Re-run with --yes.');
  }

  const apiBase = getApiBaseUrl();
  const isLocalTarget = isLocalApiBaseUrl(apiBase);
  if (!isLocalTarget) {
    const confirmToken = optionalStringArg(args, 'confirm');
    const expected = `${sectionSlug}@v${versionNumber}`;
    if (confirmToken !== expected) {
      throw new Error(`Non-local publish requires --confirm ${expected}`);
    }
  }

  const token = await getAdminAccessToken({ apiBase, fetchImpl: deps.fetchImpl });
  const section = await resolveSectionContextBySlug(apiBase, sectionSlug, token, deps.fetchImpl);

  const versions = await apiRequest<AdminSectionVersionSummary[]>(
    `${apiBase}/v1/admin/content/sections/${section.sectionSlug}/versions`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    deps.fetchImpl
  );

  const target = versions.find((item) => item.versionNumber === versionNumber);
  if (!target) {
    throw new Error(`Version ${versionNumber} not found for section ${sectionSlug}.`);
  }

  if (target.status !== 'draft') {
    throw new Error(`Version ${versionNumber} for section ${sectionSlug} is ${target.status}, expected draft.`);
  }

  const result = await apiRequest<PublishResponse>(
    `${apiBase}/v1/admin/content/publish`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        section_slug: section.sectionSlug,
        version_number: versionNumber
      })
    },
    deps.fetchImpl
  );

  deps.stdout(
    `Published ${section.sectionSlug} v${result.versionNumber}. Archived versions: ${result.archivedVersionIds.length}\n`
  );
  return 0;
}

export function isLocalApiBaseUrl(apiBase: string): boolean {
  try {
    const url = new URL(apiBase);
    const host = url.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return false;
  }
}

export async function getAdminAccessToken(input: {
  apiBase: string;
  fetchImpl: typeof fetch;
}): Promise<string> {
  const directToken = process.env.ACADEMY_ADMIN_ACCESS_TOKEN?.trim();
  if (directToken) {
    return directToken;
  }

  const email = process.env.ACADEMY_ADMIN_EMAIL?.trim();
  const password = process.env.ACADEMY_ADMIN_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error(
      'Missing admin credentials. Set ACADEMY_ADMIN_ACCESS_TOKEN or both ACADEMY_ADMIN_EMAIL and ACADEMY_ADMIN_PASSWORD.'
    );
  }

  const login = await apiRequest<{ access_token: string }>(
    `${input.apiBase}/v1/auth/login`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    },
    input.fetchImpl
  );

  if (!login.access_token || login.access_token.trim().length === 0) {
    throw new Error('Login did not return access_token.');
  }

  return login.access_token;
}

async function resolveSectionContextBySlug(
  apiBase: string,
  sectionSlug: string,
  accessToken: string,
  fetchImpl: typeof fetch
): Promise<SectionContext> {
  const sections = await apiRequest<AdminContentSectionCatalogItem[]>(
    `${apiBase}/v1/admin/content/sections`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    fetchImpl
  );

  const found = sections.find((section) => section.sectionSlug === sectionSlug);
  if (!found) {
    throw new Error(`Section slug not found: ${sectionSlug}`);
  }

  return {
    pathId: found.pathId,
    pathSlug: found.pathSlug,
    moduleId: found.moduleId,
    moduleSlug: found.moduleSlug,
    sectionId: found.sectionId,
    sectionSlug: found.sectionSlug
  };
}

export function renderPreviewHtml(input: PreviewPageInput): string {
  const blocksHtml = input.version.lessonBlocks
    .slice()
    .sort((a, b) => a.blockOrder - b.blockOrder)
    .map((block) => renderBlock(block))
    .join('\n');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    '<title>Academy Draft Preview</title>',
    '<style>',
    'body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif; margin: 2rem auto; max-width: 860px; padding: 0 1rem; line-height: 1.6; color: #1f2937; }',
    'header { border: 1px solid #d1d5db; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; background: #f9fafb; }',
    'h1,h2,h3 { line-height: 1.25; }',
    'pre { background: #111827; color: #f3f4f6; padding: 0.75rem; border-radius: 8px; overflow: auto; }',
    'code { background: #f3f4f6; padding: 0.15rem 0.35rem; border-radius: 4px; }',
    '.block { border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem; }',
    '.meta { font-size: 0.92rem; color: #4b5563; margin: 0.25rem 0; }',
    '</style>',
    '</head>',
    '<body>',
    '<header>',
    '<h1>Draft Lesson Preview</h1>',
    `<p class="meta"><strong>Path:</strong> ${escapeHtml(input.section.pathSlug)}</p>`,
    `<p class="meta"><strong>Module:</strong> ${escapeHtml(input.section.moduleSlug)}</p>`,
    `<p class="meta"><strong>Section:</strong> ${escapeHtml(input.section.sectionSlug)}</p>`,
    `<p class="meta"><strong>Version:</strong> ${input.version.versionNumber} (${escapeHtml(input.version.status)})</p>`,
    `<p class="meta"><strong>Generated:</strong> ${escapeHtml(input.generatedAtIso)}</p>`,
    '</header>',
    blocksHtml,
    '</body>',
    '</html>'
  ].join('');
}

function renderBlock(block: AdminSectionVersionDetail['lessonBlocks'][number]): string {
  if (block.blockType === 'markdown') {
    const markdown = extractMarkdown(block.contentJson);
    return `<section class="block">${markdownToHtml(markdown)}</section>`;
  }

  if (block.blockType === 'code') {
    const snippet = safeJsonFieldAsString(block.contentJson, 'snippet');
    return `<section class="block"><h3>Code Block</h3><pre>${escapeHtml(snippet ?? JSON.stringify(block.contentJson, null, 2))}</pre></section>`;
  }

  return `<section class="block"><h3>${escapeHtml(block.blockType)}</h3><pre>${escapeHtml(JSON.stringify(block.contentJson, null, 2))}</pre></section>`;
}

function extractMarkdown(contentJson: unknown): string {
  if (typeof contentJson !== 'object' || contentJson === null) {
    return '';
  }

  const markdown = (contentJson as { markdown?: unknown }).markdown;
  return typeof markdown === 'string' ? markdown : '';
}

function safeJsonFieldAsString(contentJson: unknown, key: string): string | null {
  if (typeof contentJson !== 'object' || contentJson === null) {
    return null;
  }

  const value = (contentJson as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let inCode = false;
  let paragraph: string[] = [];
  let inList = false;

  const flushParagraph = () => {
    if (paragraph.length === 0) {
      return;
    }

    out.push(`<p>${inlineMarkdown(paragraph.join(' ').trim())}</p>`);
    paragraph = [];
  };

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      closeList();
      if (!inCode) {
        out.push('<pre><code>');
        inCode = true;
      } else {
        out.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      out.push(`${escapeHtml(line)}\n`);
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      closeList();
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      closeList();
      const level = headingMatch[1].length;
      out.push(`<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeList();

  if (inCode) {
    out.push('</code></pre>');
  }

  return out.join('');
}

function inlineMarkdown(input: string): string {
  const escaped = escapeHtml(input);
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function apiRequest<T>(url: string, init: RequestInit, fetchImpl: typeof fetch): Promise<T> {
  const response = await fetchImpl(url, init);
  const text = await response.text();

  if (!response.ok) {
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // preserve raw text
    }

    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(body)}`);
  }

  if (text.trim().length === 0) {
    return {} as T;
  }

  return JSON.parse(text) as T;
}

function requireStringArg(args: Record<string, string | boolean>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing required --${key}`);
  }

  return value.trim();
}

function optionalStringArg(args: Record<string, string | boolean>, key: string): string | null {
  const value = args[key];
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? null : normalized;
}

function parseOptionalPositiveIntegerArg(args: Record<string, string | boolean>, key: string): number | null {
  const raw = optionalStringArg(args, key);
  if (raw === null) {
    return null;
  }

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`--${key} must be a positive integer`);
  }

  return parsed;
}

function parsePositiveIntegerArg(
  args: Record<string, string | boolean>,
  key: string,
  fallback?: number
): number {
  const parsed = parseOptionalPositiveIntegerArg(args, key);
  if (parsed !== null) {
    return parsed;
  }

  if (typeof fallback === 'number') {
    return fallback;
  }

  throw new Error(`Missing required --${key}`);
}

function getApiBaseUrl(): string {
  const raw = process.env.ACADEMY_API_BASE_URL?.trim();
  if (!raw) {
    return 'http://localhost:3001';
  }

  return raw.replace(/\/$/, '');
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

function defaultDeps(): CliDeps {
  return {
    fetchImpl: fetch,
    openBrowser: defaultOpenBrowser,
    runImporterValidate: defaultRunImporterValidate,
    cwd: () => process.cwd(),
    now: () => new Date(),
    stdout: (message: string) => process.stdout.write(message),
    stderr: (message: string) => process.stderr.write(message)
  };
}

export async function defaultOpenBrowser(target: string): Promise<void> {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open';
  const args =
    process.platform === 'darwin'
      ? [target]
      : process.platform === 'win32'
        ? ['/c', 'start', '', target]
        : [target];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', detached: false });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Failed to open browser via ${command} (exit ${code ?? 'unknown'})`));
    });
  });
}

export async function defaultRunImporterValidate(input: {
  root: string;
  strict: boolean;
}): Promise<number> {
  const args = ['--filter', '@academy/content-importer', 'run', 'import', '--', '--root', input.root];

  if (input.strict) {
    args.push('--strict');
  }

  return new Promise<number>((resolve, reject) => {
    const child = spawn('pnpm', args, {
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('close', (code) => {
      resolve(typeof code === 'number' ? code : 1);
    });
  });
}

function usage(): string {
  return [
    'Usage: pnpm content:cli -- <command> [options]',
    '',
    'Commands:',
    '  new --path-slug <slug> --path-title "..." --module-slug <slug> --module-title "..." --section-slug <slug> --section-title "..." [--version 1]',
    '  validate [--root content/bundles] [--strict]',
    '  import [--root content/bundles] [--dry-run] [--json]',
    '  preview --section-slug <slug> [--version <n>] [--no-open]',
    '  publish --section-slug <slug> --version <n> --yes [--confirm <slug>@v<n>]'
  ].join('\n');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error) => {
      process.stderr.write(`Unexpected failure: ${getErrorMessage(error)}\n`);
      process.exitCode = 1;
    });
}
