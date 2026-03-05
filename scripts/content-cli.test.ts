import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildLessonFrontmatter,
  getAdminAccessToken,
  isLocalApiBaseUrl,
  markdownToHtml,
  renderPreviewHtml,
  runCli,
  selectVersionForPreview
} from './content-cli';

const previousEnv = { ...process.env };

afterEach(() => {
  process.env = { ...previousEnv };
});

describe('content-cli helpers', () => {
  it('buildLessonFrontmatter includes required importer fields', () => {
    const out = buildLessonFrontmatter({
      pathSlug: 'path-a',
      pathTitle: 'Path A',
      moduleSlug: 'module-a',
      moduleTitle: 'Module A',
      sectionSlug: 'section-a',
      sectionTitle: 'Section A',
      versionNumber: 3
    });

    expect(out).toContain('path_slug: path-a');
    expect(out).toContain('module_slug: module-a');
    expect(out).toContain('section_slug: section-a');
    expect(out).toContain('version_number: 3');
  });

  it('selectVersionForPreview picks latest draft when version is omitted', () => {
    const version = selectVersionForPreview(
      [
        { id: 'v3', sectionId: 's1', versionNumber: 3, status: 'published', blockCount: 1 },
        { id: 'v2', sectionId: 's1', versionNumber: 2, status: 'draft', blockCount: 1 }
      ],
      null
    );

    expect(version.id).toBe('v2');
  });

  it('markdownToHtml renders headings and list items', () => {
    const html = markdownToHtml('# Title\n\n- one\n- two');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('renderPreviewHtml includes metadata header', () => {
    const html = renderPreviewHtml({
      section: {
        pathId: 'p1',
        pathSlug: 'path-x',
        moduleId: 'm1',
        moduleSlug: 'module-x',
        sectionId: 's1',
        sectionSlug: 'section-x'
      },
      version: {
        id: 'v1',
        sectionId: 's1',
        versionNumber: 1,
        status: 'draft',
        lessonBlocks: [
          {
            id: 'b1',
            blockOrder: 1,
            blockType: 'markdown',
            contentJson: { markdown: '# Hello' },
            estimatedSeconds: null
          }
        ]
      },
      generatedAtIso: '2026-03-05T12:00:00.000Z'
    });

    expect(html).toContain('Draft Lesson Preview');
    expect(html).toContain('path-x');
    expect(html).toContain('<strong>Version:</strong> 1 (draft)');
    expect(html).toContain('<h1>Hello</h1>');
  });

  it('detects local and non-local API base URLs', () => {
    expect(isLocalApiBaseUrl('http://localhost:3001')).toBe(true);
    expect(isLocalApiBaseUrl('http://127.0.0.1:3001')).toBe(true);
    expect(isLocalApiBaseUrl('https://academy.example.com')).toBe(false);
  });
});

describe('content-cli auth', () => {
  it('uses direct access token when env is set', async () => {
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'token-123';
    const token = await getAdminAccessToken({
      apiBase: 'http://localhost:3001',
      fetchImpl: async () => {
        throw new Error('should not call fetch');
      }
    });

    expect(token).toBe('token-123');
  });

  it('logs in with email/password when direct token is missing', async () => {
    process.env.ACADEMY_ADMIN_EMAIL = 'admin@academy.local';
    process.env.ACADEMY_ADMIN_PASSWORD = 'admin123';

    const token = await getAdminAccessToken({
      apiBase: 'http://localhost:3001',
      fetchImpl: async (url, init) => {
        expect(String(url)).toBe('http://localhost:3001/v1/auth/login');
        expect(init?.method).toBe('POST');
        return new Response(JSON.stringify({ access_token: 'logged-token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    });

    expect(token).toBe('logged-token');
  });
});

describe('content-cli command flows', () => {
  it('new command scaffolds expected file path', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'academy-cli-new-'));

    const code = await runCli(
      [
        'new',
        '--path-slug',
        'path-a',
        '--path-title',
        'Path A',
        '--module-slug',
        'module-a',
        '--module-title',
        'Module A',
        '--section-slug',
        'section-a',
        '--section-title',
        'Section A',
        '--version',
        '2'
      ],
      {
        fetchImpl: fetch,
        openBrowser: async () => {},
        runImporterValidate: async () => 0,
        cwd: () => cwd,
        now: () => new Date('2026-03-05T00:00:00.000Z'),
        stdout: () => {},
        stderr: () => {}
      }
    );

    expect(code).toBe(0);

    const filePath = path.join(cwd, 'content', 'bundles', 'path-a', 'module-a', 'section-a.v2.md');
    const output = await readFile(filePath, 'utf8');
    expect(output).toContain('path_slug: path-a');
    expect(output).toContain('version_number: 2');
    expect(output).toContain('# Section A');
  });

  it('import dry-run exits non-zero on parse errors and prints summary', async () => {
    process.env.ACADEMY_API_BASE_URL = 'http://localhost:3001';
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'direct-admin-token';

    let stdout = '';
    const code = await runCli(['import', '--dry-run'], {
      fetchImpl: async (url) => {
        expect(String(url)).toContain('/v1/admin/content/import');
        return json({
          mode: 'dry_run',
          parseReport: { errorCount: 1, warningCount: 0 },
          validationSummary: { errorCount: 1, warningCount: 0 },
          applied: false,
          abortedReason: null,
          counts: {
            pathsCreated: 0,
            pathsUpdated: 0,
            modulesCreated: 0,
            modulesUpdated: 0,
            sectionsCreated: 0,
            sectionsUpdated: 0,
            sectionVersionsCreated: 0,
            sectionVersionsUpdated: 0
          }
        });
      },
      openBrowser: async () => {},
      runImporterValidate: async () => 0,
      cwd: () => process.cwd(),
      now: () => new Date(),
      stdout: (message) => {
        stdout += message;
      },
      stderr: () => {}
    });

    expect(code).toBe(1);
    expect(stdout).toContain('Mode: dry_run');
    expect(stdout).toContain('Validation: errors=1, warnings=0');
  });

  it('import supports --json output', async () => {
    process.env.ACADEMY_API_BASE_URL = 'http://localhost:3001';
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'direct-admin-token';

    let stdout = '';
    const code = await runCli(['import', '--dry-run', '--json'], {
      fetchImpl: async () =>
        json({
          mode: 'dry_run',
          parseReport: { errorCount: 0, warningCount: 0 },
          applied: false,
          abortedReason: null,
          counts: {
            pathsCreated: 0,
            pathsUpdated: 0,
            modulesCreated: 0,
            modulesUpdated: 0,
            sectionsCreated: 0,
            sectionsUpdated: 0,
            sectionVersionsCreated: 0,
            sectionVersionsUpdated: 0
          }
        }),
      openBrowser: async () => {},
      runImporterValidate: async () => 0,
      cwd: () => process.cwd(),
      now: () => new Date(),
      stdout: (message) => {
        stdout += message;
      },
      stderr: () => {}
    });

    expect(code).toBe(0);
    expect(stdout).toContain('"mode": "dry_run"');
  });

  it('preview writes deterministic artifact and honors --no-open', async () => {
    process.env.ACADEMY_API_BASE_URL = 'http://localhost:3001';
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'direct-admin-token';
    const cwd = await mkdtemp(path.join(tmpdir(), 'academy-cli-preview-'));

    const opened: string[] = [];
    let stdout = '';
    const code = await runCli(
      ['preview', '--section-slug', 'request-response-cycle', '--version', '2', '--no-open'],
      {
        fetchImpl: async (url) => {
          const target = String(url);

          if (target.endsWith('/v1/admin/content/sections')) {
            return json([
              {
                pathId: 'p1',
                pathSlug: 'web-pentest-path',
                pathTitle: 'Web Pentest Path',
                moduleId: 'm1',
                moduleSlug: 'http-basics-module',
                moduleTitle: 'HTTP Basics',
                sectionId: 's1',
                sectionSlug: 'request-response-cycle',
                sectionTitle: 'Request/Response Cycle',
                hasQuiz: false
              }
            ]);
          }

          if (target.endsWith('/v1/admin/content/sections/request-response-cycle/versions')) {
            return json([{ id: 'sv2', sectionId: 's1', versionNumber: 2, status: 'draft', blockCount: 1 }]);
          }

          if (target.endsWith('/v1/admin/sections/s1/versions/sv2')) {
            return json({
              id: 'sv2',
              sectionId: 's1',
              versionNumber: 2,
              status: 'draft',
              lessonBlocks: [
                {
                  id: 'b1',
                  blockOrder: 1,
                  blockType: 'markdown',
                  contentJson: { markdown: '# Preview' },
                  estimatedSeconds: null
                }
              ]
            });
          }

          return new Response('not-found', { status: 404 });
        },
        openBrowser: async (target) => {
          opened.push(target);
        },
        runImporterValidate: async () => 0,
        cwd: () => cwd,
        now: () => new Date('2026-03-05T00:00:00.000Z'),
        stdout: (message) => {
          stdout += message;
        },
        stderr: () => {}
      }
    );

    expect(code).toBe(0);
    expect(opened).toHaveLength(0);
    const expectedFile = path.join(cwd, '.tmp', 'content-preview', 'request-response-cycle.v2.html');
    const html = await readFile(expectedFile, 'utf8');
    expect(html).toContain('Draft Lesson Preview');
    expect(stdout).toContain(`File: ${expectedFile}`);
    expect(stdout).toContain('Browser opened: no (--no-open)');
  });

  it('publish requires --confirm for non-local targets', async () => {
    process.env.ACADEMY_API_BASE_URL = 'https://academy.example.com';
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'direct-admin-token';

    let stderr = '';
    const code = await runCli(['publish', '--section-slug', 'request-response-cycle', '--version', '2', '--yes'], {
      fetchImpl: async () => {
        throw new Error('should not call fetch');
      },
      openBrowser: async () => {},
      runImporterValidate: async () => 0,
      cwd: () => process.cwd(),
      now: () => new Date(),
      stdout: () => {},
      stderr: (message) => {
        stderr += message;
      }
    });

    expect(code).toBe(1);
    expect(stderr).toContain('Non-local publish requires --confirm request-response-cycle@v2');
  });

  it('publish precheck blocks non-draft versions before publish call', async () => {
    process.env.ACADEMY_API_BASE_URL = 'http://localhost:3001';
    process.env.ACADEMY_ADMIN_ACCESS_TOKEN = 'direct-admin-token';

    const calls: string[] = [];
    let stderr = '';
    const code = await runCli(
      ['publish', '--section-slug', 'request-response-cycle', '--version', '2', '--yes'],
      {
        fetchImpl: async (url, init) => {
          const target = `${init?.method ?? 'GET'} ${String(url)}`;
          calls.push(target);

          if (String(url).endsWith('/v1/admin/content/sections')) {
            return json([
              {
                pathId: 'p1',
                pathSlug: 'web-pentest-path',
                pathTitle: 'Web Pentest Path',
                moduleId: 'm1',
                moduleSlug: 'http-basics-module',
                moduleTitle: 'HTTP Basics',
                sectionId: 's1',
                sectionSlug: 'request-response-cycle',
                sectionTitle: 'Request/Response Cycle',
                hasQuiz: false
              }
            ]);
          }

          if (String(url).endsWith('/v1/admin/content/sections/request-response-cycle/versions')) {
            return json([{ id: 'sv2', sectionId: 's1', versionNumber: 2, status: 'published', blockCount: 1 }]);
          }

          return new Response('not-found', { status: 404 });
        },
        openBrowser: async () => {},
        runImporterValidate: async () => 0,
        cwd: () => process.cwd(),
        now: () => new Date(),
        stdout: () => {},
        stderr: (message) => {
          stderr += message;
        }
      }
    );

    expect(code).toBe(1);
    expect(stderr).toContain('is published, expected draft');
    expect(calls).not.toContain('POST http://localhost:3001/v1/admin/content/publish');
  });
});

function json(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
