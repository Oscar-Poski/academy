import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, QuestionType, SectionVersionStatus } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Quiz Delivery API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let sectionId: string;
  let latestPublishedVersionId: string;
  let archivedPinnedVersionId: string;
  let archivedPrompts: string[];

  const userIds = {
    fresh: 'quiz-delivery-fresh-user',
    pinned: 'quiz-delivery-pinned-user'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    if (!section) {
      throw new Error('Seeded section not found. Run API migrate + seed before tests.');
    }
    sectionId = section.id;

    const latestPublishedVersion = await prisma.sectionVersion.findFirst({
      where: {
        sectionId,
        status: SectionVersionStatus.published
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: { id: true }
    });
    if (!latestPublishedVersion) {
      throw new Error('Expected a published section version for request-response-cycle.');
    }
    latestPublishedVersionId = latestPublishedVersion.id;

    const maxVersion = await prisma.sectionVersion.findFirst({
      where: { sectionId },
      orderBy: [{ versionNumber: 'desc' }],
      select: { versionNumber: true }
    });
    const archivedVersionNumber = (maxVersion?.versionNumber ?? 1) + 100;

    const archivedVersion = await prisma.sectionVersion.create({
      data: {
        sectionId,
        versionNumber: archivedVersionNumber,
        status: SectionVersionStatus.archived,
        changeLog: 'PR-33 quiz delivery pinned-version test fixture',
        publishedAt: new Date()
      },
      select: { id: true }
    });
    archivedPinnedVersionId = archivedVersion.id;

    const archivedQuestionRows = [
      {
        type: QuestionType.mcq,
        prompt: 'Archived quiz prompt A',
        optionsJson: { options: ['A1', 'A2', 'A3'] },
        answerKeyJson: { correct_option: 'A1' },
        points: 1,
        sortOrder: 1
      },
      {
        type: QuestionType.short_answer,
        prompt: 'Archived quiz prompt B',
        answerKeyJson: { mode: 'exact_ci', accepted: ['header'] },
        points: 2,
        sortOrder: 2
      }
    ] as const;
    await prisma.$transaction([
      prisma.question.create({
        data: {
          sectionVersionId: archivedPinnedVersionId,
          ...archivedQuestionRows[0]
        }
      }),
      prisma.question.create({
        data: {
          sectionVersionId: archivedPinnedVersionId,
          ...archivedQuestionRows[1]
        }
      })
    ]);
    archivedPrompts = archivedQuestionRows.map((item) => item.prompt);

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `quiz-delivery-test-${index}@academy.local` },
          update: { id, name: `Quiz Delivery Test ${index}` },
          create: {
            id,
            email: `quiz-delivery-test-${index}@academy.local`,
            name: `Quiz Delivery Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: Object.values(userIds) },
        sectionId
      }
    });
  });

  afterAll(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: Object.values(userIds) },
        sectionId
      }
    });
    await prisma.question.deleteMany({
      where: { sectionVersionId: archivedPinnedVersionId }
    });
    await prisma.sectionVersion.delete({
      where: { id: archivedPinnedVersionId }
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('returns deterministic ordered safe payload for fresh user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}`)
      .set('Authorization', bearerToken(userIds.fresh))
      .expect(200);

    expect(response.body.sectionId).toBe(sectionId);
    expect(response.body.sectionVersionId).toBe(latestPublishedVersionId);
    expect(Array.isArray(response.body.questions)).toBe(true);
    expect(response.body.questions.length).toBeGreaterThan(0);

    const sortOrders = response.body.questions.map((question: { sortOrder: number }) => question.sortOrder);
    expect(sortOrders).toEqual([...sortOrders].sort((a: number, b: number) => a - b));

    for (const question of response.body.questions as Array<Record<string, unknown>>) {
      expect(typeof question.id).toBe('string');
      expect(question.type === 'mcq' || question.type === 'short_answer').toBe(true);
      expect(typeof question.prompt).toBe('string');
      expect(typeof question.points).toBe('number');
      expect(typeof question.sortOrder).toBe('number');

      if (question.type === 'mcq') {
        expect(Array.isArray(question.options) || question.options === null).toBe(true);
      } else {
        expect(question.options).toBeNull();
      }

      expect(question).not.toHaveProperty('answerKeyJson');
      expect(question).not.toHaveProperty('explanation');
    }

    const serialized = JSON.stringify(response.body);
    expect(serialized).not.toContain('correct_option');
    expect(serialized).not.toContain('accepted');
    expect(serialized).not.toContain('pattern');
    expect(serialized).not.toContain('answerKeyJson');
    expect(serialized).not.toContain('answer_key_json');
  });

  it('resolves pinned archived version for user with progress pin', async () => {
    await prisma.userSectionProgress.create({
      data: {
        userId: userIds.pinned,
        sectionId,
        sectionVersionId: archivedPinnedVersionId,
        status: 'in_progress',
        startedAt: new Date(),
        lastSeenAt: new Date(),
        completionPct: 10
      }
    });

    const response = await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}`)
      .set('Authorization', bearerToken(userIds.pinned))
      .expect(200);

    expect(response.body.sectionVersionId).toBe(archivedPinnedVersionId);
    expect(response.body.questions).toHaveLength(2);
    expect(response.body.questions.map((q: { prompt: string }) => q.prompt)).toEqual(archivedPrompts);
  });

  it('rejects missing/malformed bearer and unknown subject token', async () => {
    await request(app.getHttpServer()).get(`/v1/quizzes/sections/${sectionId}`).expect(401);

    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}`)
      .set('Authorization', 'Bearer malformed-token')
      .expect(401);

    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}`)
      .set('Authorization', bearerToken('quiz-delivery-unknown-user'))
      .expect(400);
  });

  it('returns 404 for unknown section id', async () => {
    await request(app.getHttpServer())
      .get('/v1/quizzes/sections/nonexistent-section-id')
      .set('Authorization', bearerToken(userIds.fresh))
      .expect(404);
  });
});
