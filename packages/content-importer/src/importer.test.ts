import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { parseContentBundle } from './importer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDirs: string[] = [];

async function makeTempBundle(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'academy-content-importer-'));
  tempDirs.push(dir);
  return dir;
}

async function writeDoc(root: string, relativePath: string, contents: string) {
  const fullPath = path.join(root, relativePath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents, 'utf8');
  return fullPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('parseContentBundle', () => {
  it('parses valid bundle into normalized aggregates', async () => {
    const fixtureRoot = path.resolve(__dirname, '../fixtures/sample-bundle');
    const report = await parseContentBundle(fixtureRoot);

    expect(report.errorCount).toBe(0);
    expect(report.parsedFileCount).toBe(2);
    expect(report.scannedFileCount).toBe(2);
    expect(report.sectionVersions).toHaveLength(2);
    expect(report.paths).toHaveLength(1);
    expect(report.modules).toHaveLength(1);
    expect(report.sections).toHaveLength(2);

    for (const version of report.sectionVersions) {
      expect(version.status).toBe('draft');
      expect(version.blocks).toHaveLength(1);
      expect(version.blocks[0]).toMatchObject({
        blockOrder: 1,
        blockType: 'markdown'
      });
    }
  });

  it('reports invalid frontmatter file as error and skips document', async () => {
    const root = await makeTempBundle();
    await writeDoc(
      root,
      'invalid.mdx',
      `---
path_slug: web-pentest-path
path_title: Web Pentest Path
module_slug: http-basics-module
module_title: HTTP Basics
section_slug: broken-section
section_title: Broken Section
---
# Missing version number
`
    );

    const report = await parseContentBundle(root);

    expect(report.errorCount).toBeGreaterThan(0);
    expect(report.sectionVersions).toHaveLength(0);
    expect(report.messages.some((m) => m.code === 'invalid_frontmatter')).toBe(true);
  });

  it('detects duplicate section version key conflict', async () => {
    const root = await makeTempBundle();
    const sharedFrontmatter = `---
path_slug: web-pentest-path
path_title: Web Pentest Path
module_slug: http-basics-module
module_title: HTTP Basics
section_slug: dup-section
section_title: Duplicate Section
version_number: 2
---`;

    await writeDoc(root, 'a.md', `${sharedFrontmatter}\n\n# A\n`);
    await writeDoc(root, 'b.mdx', `${sharedFrontmatter}\n\n# B\n`);

    const report = await parseContentBundle(root);

    expect(report.messages.some((m) => m.code === 'duplicate_section_version')).toBe(true);
    expect(report.sectionVersions).toHaveLength(1);
  });

  it('warns on ignored status frontmatter and keeps draft status', async () => {
    const root = await makeTempBundle();
    await writeDoc(
      root,
      'status.md',
      `---
path_slug: web-pentest-path
path_title: Web Pentest Path
module_slug: http-basics-module
module_title: HTTP Basics
section_slug: status-demo
section_title: Status Demo
version_number: 1
status: published
---
# Status is ignored
`
    );

    const report = await parseContentBundle(root);

    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.messages.some((m) => m.code === 'ignored_status')).toBe(true);
    expect(report.sectionVersions[0]?.status).toBe('draft');
  });
});

