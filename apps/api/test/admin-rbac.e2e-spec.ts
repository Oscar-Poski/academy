import { INestApplication } from '@nestjs/common';
import { LessonBlockType, PrismaClient, SectionVersionStatus, UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Admin RBAC enforcement (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let adminAccessToken = '';
  let learnerAccessToken = '';
  let adminUserId = '';
  let learnerUserId = '';
  const fixtureAdminEmail = `admin-rbac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@academy.local`;
  const fixtureAdminPassword = 'admin123';
  const fixtureLearnerEmail = `learner-rbac-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@academy.local`;
  const fixtureLearnerPassword = 'password123';

  let sectionId = '';
  let publishedVersionId = '';
  let draftVersionId = '';
  let tempBundleDir = '';

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const [adminPasswordHash, learnerPasswordHash] = await Promise.all([
      hash(fixtureAdminPassword, 10),
      hash(fixtureLearnerPassword, 10)
    ]);

    const fixtureAdmin = await prisma.user.create({
      data: {
        email: fixtureAdminEmail,
        name: 'Admin RBAC Fixture',
        role: UserRole.admin,
        passwordHash: adminPasswordHash
      },
      select: { id: true }
    });
    const fixtureLearner = await prisma.user.create({
      data: {
        email: fixtureLearnerEmail,
        name: 'Learner RBAC Fixture',
        role: UserRole.user,
        passwordHash: learnerPasswordHash
      },
      select: { id: true }
    });
    adminUserId = fixtureAdmin.id;
    learnerUserId = fixtureLearner.id;

    adminAccessToken = await login(fixtureAdminEmail, fixtureAdminPassword);
    learnerAccessToken = await login(fixtureLearnerEmail, fixtureLearnerPassword);

    const sectionFixture = await createSectionFixture();
    sectionId = sectionFixture.sectionId;
    publishedVersionId = sectionFixture.publishedVersionId;
    draftVersionId = sectionFixture.draftVersionId;

    tempBundleDir = await createValidBundleDir();
  });

  afterAll(async () => {
    if (tempBundleDir) {
      await rm(tempBundleDir, { recursive: true, force: true });
    }

    if (sectionId) {
      await prisma.lessonBlock.deleteMany({
        where: {
          sectionVersion: {
            sectionId
          }
        }
      });

      await prisma.sectionVersion.deleteMany({ where: { sectionId } });
      await prisma.section.deleteMany({ where: { id: sectionId } });
    }
    await prisma.authRefreshToken.deleteMany({
      where: {
        userId: { in: [adminUserId, learnerUserId].filter((id) => id.length > 0) }
      }
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUserId, learnerUserId].filter((id) => id.length > 0) }
      }
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('allows admin bearer token on all admin routes', async () => {
    await request(app.getHttpServer())
      .post('/v1/admin/content/import')
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .send({
        bundle_path: tempBundleDir,
        mode: 'dryRun'
      })
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/admin/sections/${sectionId}/versions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/admin/sections/${sectionId}/versions/${draftVersionId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/v1/admin/sections/${sectionId}/publish/${draftVersionId}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);
  });

  it('denies learner bearer token on all admin routes with standardized 403', async () => {
    await expectForbidden(
      request(app.getHttpServer())
        .post('/v1/admin/content/import')
        .set('Authorization', `Bearer ${learnerAccessToken}`)
        .send({ bundle_path: tempBundleDir, mode: 'dryRun' })
    );

    await expectForbidden(
      request(app.getHttpServer())
        .get(`/v1/admin/sections/${sectionId}/versions`)
        .set('Authorization', `Bearer ${learnerAccessToken}`)
    );

    await expectForbidden(
      request(app.getHttpServer())
        .get(`/v1/admin/sections/${sectionId}/versions/${publishedVersionId}`)
        .set('Authorization', `Bearer ${learnerAccessToken}`)
    );

    await expectForbidden(
      request(app.getHttpServer())
        .post(`/v1/admin/sections/${sectionId}/publish/${publishedVersionId}`)
        .set('Authorization', `Bearer ${learnerAccessToken}`)
    );
  });

  it('denies missing or invalid bearer token with standardized 403', async () => {
    await expectForbidden(request(app.getHttpServer()).get(`/v1/admin/sections/${sectionId}/versions`));

    await expectForbidden(
      request(app.getHttpServer())
        .get(`/v1/admin/sections/${sectionId}/versions`)
        .set('Authorization', 'Bearer not-a-real-token')
    );
  });

  it('uses bearer principal only on admin routes when bearer and x-user-id conflict', async () => {
    await expectForbidden(
      request(app.getHttpServer())
        .get(`/v1/admin/sections/${sectionId}/versions`)
        .set('Authorization', `Bearer ${learnerAccessToken}`)
        .set('x-user-id', adminUserId)
    );
  });

  async function expectForbidden(req: request.Test): Promise<void> {
    const response = await req.expect(403);
    expect(response.body).toEqual({
      code: 'forbidden',
      message: 'Admin access required'
    });
  }

  async function login(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/v1/auth/login').send({ email, password });

    if (response.status !== 200 || typeof response.body.access_token !== 'string') {
      throw new Error(`login failed for ${email}`);
    }

    return response.body.access_token;
  }

  async function createSectionFixture(): Promise<{
    sectionId: string;
    publishedVersionId: string;
    draftVersionId: string;
  }> {
    const seededModule = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    if (!seededModule) {
      throw new Error('Seeded module missing. Run API migrate+seed first.');
    }

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const section = await prisma.section.create({
      data: {
        moduleId: seededModule.id,
        slug: `admin-rbac-section-${unique}`,
        title: `Admin RBAC Section ${unique}`,
        sortOrder: 9999,
        hasQuiz: false
      },
      select: { id: true }
    });

    const published = await prisma.sectionVersion.create({
      data: {
        sectionId: section.id,
        versionNumber: 1,
        status: SectionVersionStatus.published,
        changeLog: 'published',
        publishedAt: new Date()
      },
      select: { id: true }
    });

    const draft = await prisma.sectionVersion.create({
      data: {
        sectionId: section.id,
        versionNumber: 2,
        status: SectionVersionStatus.draft,
        changeLog: 'draft'
      },
      select: { id: true }
    });

    await prisma.lessonBlock.createMany({
      data: [
        {
          sectionVersionId: published.id,
          blockOrder: 1,
          blockType: LessonBlockType.markdown,
          contentJson: { markdown: 'published version' }
        },
        {
          sectionVersionId: draft.id,
          blockOrder: 1,
          blockType: LessonBlockType.markdown,
          contentJson: { markdown: 'draft version' }
        }
      ]
    });

    return {
      sectionId: section.id,
      publishedVersionId: published.id,
      draftVersionId: draft.id
    };
  }

  async function createValidBundleDir(): Promise<string> {
    const seed = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const dir = await mkdtemp(path.join(os.tmpdir(), 'academy-admin-rbac-import-'));
    const fullPath = path.join(dir, 'lesson.v1.md');

    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(
      fullPath,
      `---
path_slug: admin-rbac-import-path-${seed}
path_title: Admin RBAC Import Path ${seed}
path_sort_order: 1
module_slug: admin-rbac-import-module-${seed}
module_title: Admin RBAC Import Module ${seed}
module_sort_order: 1
section_slug: admin-rbac-import-section-${seed}
section_title: Admin RBAC Import Section ${seed}
section_sort_order: 1
section_has_quiz: false
version_number: 1
change_log: admin-rbac e2e
created_by: admin-rbac
estimated_seconds: 60
---
# Admin RBAC Import
`
    );

    return dir;
  }
});
