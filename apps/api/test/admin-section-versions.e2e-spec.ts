import { INestApplication } from '@nestjs/common';
import { LessonBlockType, PrismaClient, SectionVersionStatus, UserRole } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module';

type VersionFixture = {
  userIds: string[];
  sectionId: string;
  versionIds: string[];
};

describe('Admin Section Versions API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let adminAccessToken = '';
  let adminUserId = '';
  const fixtureAdminEmail = `admin-versions-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@academy.local`;
  const fixtureAdminPassword = 'admin123';
  const createdFixtures: VersionFixture[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const passwordHash = await hash(fixtureAdminPassword, 10);
    const fixtureAdmin = await prisma.user.create({
      data: {
        email: fixtureAdminEmail,
        name: 'Admin Section Versions Fixture',
        role: UserRole.admin,
        passwordHash
      },
      select: { id: true }
    });
    adminUserId = fixtureAdmin.id;

    adminAccessToken = await loginAsAdmin();
  });

  afterEach(async () => {
    for (const fixture of createdFixtures.splice(0)) {
      await prisma.userSectionProgress.deleteMany({
        where: { sectionId: fixture.sectionId }
      });

      if (fixture.versionIds.length > 0) {
        await prisma.lessonBlock.deleteMany({
          where: {
            sectionVersionId: { in: fixture.versionIds }
          }
        });
      }

      await prisma.sectionVersion.deleteMany({
        where: { id: { in: fixture.versionIds } }
      });

      await prisma.section.deleteMany({
        where: { id: fixture.sectionId }
      });

      if (fixture.userIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: fixture.userIds } }
        });
      }
    }
  });

  afterAll(async () => {
    if (adminUserId) {
      await prisma.authRefreshToken.deleteMany({ where: { userId: adminUserId } });
      await prisma.user.deleteMany({ where: { id: adminUserId } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('GET /v1/admin/sections/:sectionId/versions returns ordered summaries', async () => {
    const fixture = await createSectionWithVersions({ includeV3Draft: true });

    const response = await request(app.getHttpServer())
      .get(`/v1/admin/sections/${fixture.section.id}/versions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(3);
    expect(response.body.map((v: { versionNumber: number }) => v.versionNumber)).toEqual([3, 2, 1]);

    for (const row of response.body) {
      expect(typeof row.id).toBe('string');
      expect(row.sectionId).toBe(fixture.section.id);
      expect(typeof row.blockCount).toBe('number');
    }
  });

  it('GET /v1/admin/sections/:sectionId/versions/:versionId returns version preview with ordered blocks', async () => {
    const fixture = await createSectionWithVersions();

    const response = await request(app.getHttpServer())
      .get(`/v1/admin/sections/${fixture.section.id}/versions/${fixture.v2.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body.id).toBe(fixture.v2.id);
    expect(response.body.sectionId).toBe(fixture.section.id);
    expect(response.body.versionNumber).toBe(2);
    expect(Array.isArray(response.body.lessonBlocks)).toBe(true);
    expect(response.body.lessonBlocks.length).toBeGreaterThanOrEqual(2);

    const blockOrders = response.body.lessonBlocks.map((block: { blockOrder: number }) => block.blockOrder);
    expect(blockOrders).toEqual([...blockOrders].sort((a, b) => a - b));
  });

  it('POST publish archives previously published version and publishes target draft', async () => {
    const fixture = await createSectionWithVersions();

    const beforeV1Blocks = await prisma.lessonBlock.findMany({
      where: { sectionVersionId: fixture.v1.id },
      orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }]
    });
    const beforeV2Blocks = await prisma.lessonBlock.findMany({
      where: { sectionVersionId: fixture.v2.id },
      orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }]
    });

    const response = await request(app.getHttpServer())
      .post(`/v1/admin/sections/${fixture.section.id}/publish/${fixture.v2.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body.sectionId).toBe(fixture.section.id);
    expect(response.body.versionId).toBe(fixture.v2.id);
    expect(response.body.versionNumber).toBe(2);
    expect(response.body.status).toBe('published');
    expect(Array.isArray(response.body.archivedVersionIds)).toBe(true);
    expect(response.body.archivedVersionIds).toContain(fixture.v1.id);

    const v1 = await prisma.sectionVersion.findUnique({ where: { id: fixture.v1.id } });
    const v2 = await prisma.sectionVersion.findUnique({ where: { id: fixture.v2.id } });

    expect(v1?.status).toBe(SectionVersionStatus.archived);
    expect(v2?.status).toBe(SectionVersionStatus.published);
    expect(v2?.publishedAt).toBeInstanceOf(Date);

    const afterV1Blocks = await prisma.lessonBlock.findMany({
      where: { sectionVersionId: fixture.v1.id },
      orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }]
    });
    const afterV2Blocks = await prisma.lessonBlock.findMany({
      where: { sectionVersionId: fixture.v2.id },
      orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }]
    });

    expect(afterV1Blocks).toHaveLength(beforeV1Blocks.length);
    expect(afterV2Blocks).toHaveLength(beforeV2Blocks.length);
    expect(afterV1Blocks.map((b) => b.contentJson)).toEqual(beforeV1Blocks.map((b) => b.contentJson));
    expect(afterV2Blocks.map((b) => b.contentJson)).toEqual(beforeV2Blocks.map((b) => b.contentJson));
  });

  it('publishing preserves pinned-user behavior while public resolves new published version', async () => {
    const fixture = await createSectionWithVersions();
    const unique = fixture.unique;

    const pinnedUser = await prisma.user.create({
      data: {
        email: `admin-version-pin-${unique}@academy.local`,
        name: 'Admin Version Pin User'
      }
    });

    createdFixtures[createdFixtures.length - 1].userIds.push(pinnedUser.id);

    const start = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${fixture.section.id}/start`)
      .set('x-user-id', pinnedUser.id)
      .expect(201);

    expect(start.body.sectionVersionId).toBe(fixture.v1.id);

    await request(app.getHttpServer())
      .post(`/v1/admin/sections/${fixture.section.id}/publish/${fixture.v2.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(200);

    const pinnedResponse = await request(app.getHttpServer())
      .get(`/v1/sections/${fixture.section.id}`)
      .set('x-user-id', pinnedUser.id)
      .expect(200);
    expect(pinnedResponse.body.sectionVersionId).toBe(fixture.v1.id);
    expect(pinnedResponse.body.lessonBlocks[0].contentJson.markdown).toContain('v1 block');

    const publicResponse = await request(app.getHttpServer())
      .get(`/v1/sections/${fixture.section.id}`)
      .expect(200);
    expect(publicResponse.body.sectionVersionId).toBe(fixture.v2.id);
    expect(publicResponse.body.lessonBlocks[0].contentJson.markdown).toContain('v2 block');
  });

  it('POST publish rejects non-draft target with 409', async () => {
    const fixture = await createSectionWithVersions();

    await request(app.getHttpServer())
      .post(`/v1/admin/sections/${fixture.section.id}/publish/${fixture.v1.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(409);
  });

  it('GET/POST return 404 for invalid section/version combinations', async () => {
    const fixtureOne = await createSectionWithVersions();
    const fixtureTwo = await createSectionWithVersions();

    await request(app.getHttpServer())
      .get(`/v1/admin/sections/${fixtureOne.section.id}/versions/${fixtureTwo.v2.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/v1/admin/sections/${fixtureOne.section.id}/publish/${fixtureTwo.v2.id}`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/v1/admin/sections/nonexistent-section-id/versions`)
      .set('Authorization', `Bearer ${adminAccessToken}`)
      .expect(404);
  });

  async function createSectionWithVersions(options?: { includeV3Draft?: boolean }) {
    const seededModule = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' }
    });
    expect(seededModule).toBeTruthy();

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const section = await prisma.section.create({
      data: {
        moduleId: seededModule!.id,
        slug: `admin-version-section-${unique}`,
        title: `Admin Version Section ${unique}`,
        sortOrder: 9000,
        hasQuiz: false
      }
    });

    const v1 = await prisma.sectionVersion.create({
      data: {
        sectionId: section.id,
        versionNumber: 1,
        status: SectionVersionStatus.published,
        changeLog: 'v1 published',
        publishedAt: new Date()
      }
    });

    const v2 = await prisma.sectionVersion.create({
      data: {
        sectionId: section.id,
        versionNumber: 2,
        status: SectionVersionStatus.draft,
        changeLog: 'v2 draft'
      }
    });

    let v3: { id: string; versionNumber: number } | null = null;
    if (options?.includeV3Draft) {
      v3 = await prisma.sectionVersion.create({
        data: {
          sectionId: section.id,
          versionNumber: 3,
          status: SectionVersionStatus.draft,
          changeLog: 'v3 draft'
        }
      });
    }

    const blocks = [
      {
        sectionVersionId: v1.id,
        blockOrder: 1,
        blockType: LessonBlockType.markdown,
        contentJson: { markdown: `v1 block ${unique}` }
      },
      {
        sectionVersionId: v2.id,
        blockOrder: 1,
        blockType: LessonBlockType.markdown,
        contentJson: { markdown: `v2 block ${unique}` }
      },
      {
        sectionVersionId: v2.id,
        blockOrder: 2,
        blockType: LessonBlockType.code,
        contentJson: { language: 'txt', snippet: `v2 code ${unique}` }
      }
    ];

    if (v3) {
      blocks.push({
        sectionVersionId: v3.id,
        blockOrder: 1,
        blockType: LessonBlockType.markdown,
        contentJson: { markdown: `v3 block ${unique}` }
      });
    }

    await prisma.lessonBlock.createMany({ data: blocks });

    createdFixtures.push({
      userIds: [],
      sectionId: section.id,
      versionIds: [v1.id, v2.id, ...(v3 ? [v3.id] : [])]
    });

    return {
      unique,
      section,
      v1,
      v2,
      v3
    };
  }

  async function loginAsAdmin(): Promise<string> {
    const response = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureAdminEmail,
      password: fixtureAdminPassword
    });

    if (response.status !== 200 || typeof response.body.access_token !== 'string') {
      throw new Error('admin login failed in admin-section-versions.e2e-spec');
    }

    return response.body.access_token;
  }
});
