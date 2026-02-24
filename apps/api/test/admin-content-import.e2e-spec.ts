import { INestApplication } from '@nestjs/common';
import { PrismaClient, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type TempBundleRecord = {
  dir: string;
  pathSlug: string;
  moduleSlug: string;
  sectionSlug: string;
  versionNumber: number;
};

describe('Admin Content Import API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const tempBundles: TempBundleRecord[] = [];
  const tempDirs: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    for (const bundle of tempBundles.splice(0)) {
      await prisma.path.deleteMany({
        where: { slug: bundle.pathSlug }
      });
    }

    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/admin/content/import dryRun returns report without DB writes', async () => {
    const bundle = await createValidBundle();

    const response = await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: bundle.dir,
        mode: 'dryRun'
      })
      .expect(200);

    expect(response.body.mode).toBe('dry_run');
    expect(response.body.applied).toBe(false);
    expect(response.body.abortedReason).toBeNull();
    expect(response.body.parseReport.errorCount).toBe(0);

    const persistedPath = await prisma.path.findUnique({
      where: { slug: bundle.pathSlug }
    });
    expect(persistedPath).toBeNull();
  });

  it('POST /v1/admin/content/import apply writes draft content', async () => {
    const bundle = await createValidBundle();

    const response = await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: bundle.dir,
        mode: 'apply'
      })
      .expect(200);

    expect(response.body.mode).toBe('apply');
    expect(response.body.applied).toBe(true);
    expect(response.body.abortedReason).toBeNull();
    expect(response.body.counts.pathsCreated).toBe(1);
    expect(response.body.counts.modulesCreated).toBe(1);
    expect(response.body.counts.sectionsCreated).toBe(1);
    expect(response.body.counts.sectionVersionsCreated).toBe(1);

    const pathRow = await prisma.path.findUnique({
      where: { slug: bundle.pathSlug }
    });
    expect(pathRow).toBeTruthy();

    const moduleRow = await prisma.module.findUnique({
      where: { slug: bundle.moduleSlug }
    });
    expect(moduleRow).toBeTruthy();

    const sectionRow = await prisma.section.findUnique({
      where: { slug: bundle.sectionSlug }
    });
    expect(sectionRow).toBeTruthy();

    const versionRow = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId: sectionRow!.id,
          versionNumber: bundle.versionNumber
        }
      }
    });
    expect(versionRow).toBeTruthy();
    expect(versionRow!.status).toBe(SectionVersionStatus.draft);

    const lessonBlocks = await prisma.lessonBlock.findMany({
      where: { sectionVersionId: versionRow!.id },
      orderBy: [{ blockOrder: 'asc' }]
    });
    expect(lessonBlocks).toHaveLength(1);
    expect(lessonBlocks[0].blockType).toBe('markdown');
  });

  it('POST /v1/admin/content/import apply is idempotent on repeated requests', async () => {
    const bundle = await createValidBundle();

    await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: bundle.dir,
        mode: 'apply'
      })
      .expect(200);

    const second = await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: bundle.dir,
        mode: 'apply'
      })
      .expect(200);

    expect(second.body.mode).toBe('apply');
    expect(second.body.applied).toBe(true);
    expect(second.body.counts.sectionVersionsCreated).toBe(0);
    expect(second.body.counts.sectionVersionsUpdated).toBeGreaterThanOrEqual(1);

    const sectionRow = await prisma.section.findUnique({
      where: { slug: bundle.sectionSlug }
    });
    expect(sectionRow).toBeTruthy();

    const versions = await prisma.sectionVersion.findMany({
      where: {
        sectionId: sectionRow!.id,
        versionNumber: bundle.versionNumber
      }
    });
    expect(versions).toHaveLength(1);
  });

  it('POST /v1/admin/content/import rejects invalid request body', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: '',
        mode: 'nope'
      })
      .expect(400);
  });

  it('POST /v1/admin/content/import rejects nonexistent bundle path', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: `/tmp/academy-import-missing-${Date.now()}`,
        mode: 'dryRun'
      })
      .expect(400);
  });

  it('POST /v1/admin/content/import apply returns parse-error report without writes', async () => {
    const bundle = await createInvalidBundle();

    const response = await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .send({
        bundle_path: bundle.dir,
        mode: 'apply'
      })
      .expect(200);

    expect(response.body.mode).toBe('apply');
    expect(response.body.applied).toBe(false);
    expect(response.body.abortedReason).toBe('parse_errors');
    expect(response.body.parseReport.errorCount).toBeGreaterThan(0);

    const persistedPath = await prisma.path.findUnique({
      where: { slug: bundle.pathSlug }
    });
    expect(persistedPath).toBeNull();
  });

  async function createValidBundle(): Promise<TempBundleRecord> {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pathSlug = `admin-import-path-${seed}`;
    const moduleSlug = `admin-import-module-${seed}`;
    const sectionSlug = `admin-import-section-${seed}`;
    const versionNumber = 1;
    const dir = await makeTempDir();

    await writeBundleDoc(
      dir,
      'lesson.v1.md',
      `---
path_slug: ${pathSlug}
path_title: Admin Import Path ${seed}
path_sort_order: 1
module_slug: ${moduleSlug}
module_title: Admin Import Module ${seed}
module_sort_order: 1
section_slug: ${sectionSlug}
section_title: Admin Import Section ${seed}
section_sort_order: 1
section_has_quiz: false
version_number: ${versionNumber}
change_log: Admin import e2e
created_by: admin-e2e
estimated_seconds: 45
---
# Admin Import E2E

This bundle is generated during the admin import e2e test.
`
    );

    const bundle = { dir, pathSlug, moduleSlug, sectionSlug, versionNumber };
    tempBundles.push(bundle);
    return bundle;
  }

  async function createInvalidBundle(): Promise<TempBundleRecord> {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pathSlug = `admin-import-invalid-path-${seed}`;
    const moduleSlug = `admin-import-invalid-module-${seed}`;
    const sectionSlug = `admin-import-invalid-section-${seed}`;
    const versionNumber = 1;
    const dir = await makeTempDir();

    await writeBundleDoc(
      dir,
      'invalid.v1.md',
      `---
path_slug: ${pathSlug}
path_title: Invalid Path ${seed}
module_slug: ${moduleSlug}
module_title: Invalid Module ${seed}
section_slug: ${sectionSlug}
section_title: Invalid Section ${seed}
---
# Missing version number
`
    );

    const bundle = { dir, pathSlug, moduleSlug, sectionSlug, versionNumber };
    tempBundles.push(bundle);
    return bundle;
  }

  async function makeTempDir(): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'academy-admin-import-'));
    tempDirs.push(dir);
    return dir;
  }

  async function writeBundleDoc(root: string, relativePath: string, contents: string): Promise<void> {
    const fullPath = path.join(root, relativePath);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, contents, 'utf8');
  }
});

