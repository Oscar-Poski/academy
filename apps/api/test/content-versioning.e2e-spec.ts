import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LessonBlockType, PrismaClient, SectionVersionStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Content API version-aware section retrieval (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('returns pinned version for user and current published version for public requests', async () => {
    const seededModule = await prisma.module.findUnique({ where: { slug: 'http-basics-module' } });
    expect(seededModule).toBeTruthy();

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const testUser = await prisma.user.create({
      data: {
        email: `content-versioning-${unique}@academy.local`,
        name: 'Content Versioning Test User'
      }
    });
    const noProgressUser = await prisma.user.create({
      data: {
        email: `content-versioning-np-${unique}@academy.local`,
        name: 'Content Versioning No Progress User'
      }
    });

    const testSection = await prisma.section.create({
      data: {
        moduleId: seededModule!.id,
        slug: `versioning-test-section-${unique}`,
        title: 'Versioning Test Section',
        sortOrder: 9990,
        hasQuiz: false
      }
    });

    const v1 = await prisma.sectionVersion.create({
      data: {
        sectionId: testSection.id,
        versionNumber: 1,
        status: SectionVersionStatus.published,
        changeLog: 'v1 published',
        publishedAt: new Date()
      }
    });

    const v2 = await prisma.sectionVersion.create({
      data: {
        sectionId: testSection.id,
        versionNumber: 2,
        status: SectionVersionStatus.draft,
        changeLog: 'v2 draft'
      }
    });

    await prisma.lessonBlock.createMany({
      data: [
        {
          sectionVersionId: v1.id,
          blockOrder: 1,
          blockType: LessonBlockType.markdown,
          contentJson: { markdown: 'v1 block' }
        },
        {
          sectionVersionId: v2.id,
          blockOrder: 1,
          blockType: LessonBlockType.markdown,
          contentJson: { markdown: 'v2 block' }
        }
      ]
    });

    let swapped = false;

    try {
      const start = await request(app.getHttpServer())
        .post(`/v1/progress/sections/${testSection.id}/start`)
        .set('Authorization', bearerToken(testUser.id))
        .expect(201);

      expect(start.body.sectionVersionId).toBe(v1.id);

      await prisma.$transaction(async (tx) => {
        await tx.sectionVersion.update({
          where: { id: v1.id },
          data: { status: SectionVersionStatus.archived, publishedAt: null }
        });
        await tx.sectionVersion.update({
          where: { id: v2.id },
          data: { status: SectionVersionStatus.published, publishedAt: new Date() }
        });
      });
      swapped = true;

      const pinnedResponse = await request(app.getHttpServer())
        .get(`/v1/sections/${testSection.id}`)
        .set('Authorization', bearerToken(testUser.id))
        .expect(200);
      expect(pinnedResponse.body.sectionVersionId).toBe(v1.id);
      expect(pinnedResponse.body.lessonBlocks[0].contentJson.markdown).toBe('v1 block');

      const publicResponse = await request(app.getHttpServer())
        .get(`/v1/sections/${testSection.id}`)
        .expect(200);
      expect(publicResponse.body.sectionVersionId).toBe(v2.id);
      expect(publicResponse.body.lessonBlocks[0].contentJson.markdown).toBe('v2 block');

      const noProgressResponse = await request(app.getHttpServer())
        .get(`/v1/sections/${testSection.id}`)
        .set('Authorization', bearerToken(noProgressUser.id))
        .expect(200);
      expect(noProgressResponse.body.sectionVersionId).toBe(v2.id);
    } finally {
      if (swapped) {
        await prisma.$transaction(async (tx) => {
          await tx.sectionVersion.update({
            where: { id: v2.id },
            data: { status: SectionVersionStatus.draft, publishedAt: null }
          });
          await tx.sectionVersion.update({
            where: { id: v1.id },
            data: { status: SectionVersionStatus.published, publishedAt: new Date() }
          });
        });
      }

      await prisma.userSectionProgress.deleteMany({ where: { sectionId: testSection.id } });
      await prisma.lessonBlock.deleteMany({ where: { sectionVersionId: { in: [v1.id, v2.id] } } });
      await prisma.sectionVersion.deleteMany({ where: { id: { in: [v1.id, v2.id] } } });
      await prisma.section.delete({ where: { id: testSection.id } });
      await prisma.user.deleteMany({ where: { id: { in: [testUser.id, noProgressUser.id] } } });
    }
  });
});
