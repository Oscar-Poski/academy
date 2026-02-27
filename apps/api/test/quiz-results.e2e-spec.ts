import { INestApplication } from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Quiz Result Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let sectionId: string;
  let mcqQuestions: Array<{ id: string; answerKeyJson: unknown }>;

  const userIds = {
    latest: 'quiz-result-latest-user',
    fresh: 'quiz-result-fresh-user',
    missing: 'quiz-result-missing-user',
    unknown: 'quiz-result-unknown-user'
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

    const version = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId,
          versionNumber: 1
        }
      },
      select: { id: true, status: true }
    });
    if (!version || version.status !== SectionVersionStatus.published) {
      throw new Error('Seeded published section version not found for request-response-cycle v1.');
    }

    mcqQuestions = await prisma.question.findMany({
      where: {
        sectionVersionId: version.id,
        type: QuestionType.mcq
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        answerKeyJson: true
      }
    });
    if (mcqQuestions.length < 2) {
      throw new Error('Expected at least 2 seeded MCQ questions.');
    }

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `quiz-result-test-${index}@academy.local` },
          update: { id, name: `Quiz Result Test ${index}` },
          create: {
            id,
            email: `quiz-result-test-${index}@academy.local`,
            name: `Quiz Result Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.quizAttemptAnswer.deleteMany({
      where: {
        attempt: {
          userId: { in: Object.values(userIds) }
        }
      }
    });
    await prisma.quizAttempt.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
  });

  afterAll(async () => {
    await prisma.quizAttemptAnswer.deleteMany({
      where: {
        attempt: {
          userId: { in: Object.values(userIds) }
        }
      }
    });
    await prisma.quizAttempt.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('GET latest returns newest attempt by submittedAt/attemptNo ordering', async () => {
    const allCorrect = mcqQuestions.map((question) => ({
      question_id: question.id,
      selected_option: getCorrectOption(question.answerKeyJson)
    }));

    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.latest)
      .send({ answers: allCorrect })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.latest)
      .send({
        answers: [
          {
            question_id: mcqQuestions[0].id,
            selected_option: '__wrong__'
          }
        ]
      })
      .expect(201);

    const latest = await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/attempts/latest`)
      .set('x-user-id', userIds.latest)
      .expect(200);

    expect(latest.body.attemptNo).toBe(2);
    expect(latest.body.userId).toBe(userIds.latest);
    expect(latest.body.sectionId).toBe(sectionId);
    expect(Array.isArray(latest.body.feedback)).toBe(true);
  });

  it('GET latest returns 404 when user has no attempts for section', async () => {
    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/attempts/latest`)
      .set('x-user-id', userIds.fresh)
      .expect(404);
  });

  it('GET result returns no-attempt shape for fresh user', async () => {
    const result = await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/result`)
      .set('x-user-id', userIds.fresh)
      .expect(200);

    expect(result.body.sectionId).toBe(sectionId);
    expect(result.body.hasAttempt).toBe(false);
    expect(result.body.latestAttempt).toBeNull();
  });

  it('GET result returns latest attempt summary when attempts exist', async () => {
    const create = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.latest)
      .send({
        answers: mcqQuestions.map((question) => ({
          question_id: question.id,
          selected_option: getCorrectOption(question.answerKeyJson)
        }))
      })
      .expect(201);

    const result = await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/result`)
      .set('x-user-id', userIds.latest)
      .expect(200);

    expect(result.body.sectionId).toBe(sectionId);
    expect(result.body.hasAttempt).toBe(true);
    expect(result.body.latestAttempt).toBeTruthy();
    expect(result.body.latestAttempt.attemptId).toBe(create.body.attemptId);
    expect(result.body.latestAttempt.attemptNo).toBe(create.body.attemptNo);
    expect(result.body.latestAttempt.score).toBe(create.body.score);
    expect(result.body.latestAttempt.maxScore).toBe(create.body.maxScore);
    expect(result.body.latestAttempt.passed).toBe(create.body.passed);
  });

  it('GET latest/result reject missing or unknown x-user-id', async () => {
    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/attempts/latest`)
      .expect(400);

    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/result`)
      .expect(400);

    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/attempts/latest`)
      .set('x-user-id', 'unknown-user-id-not-created')
      .expect(400);

    await request(app.getHttpServer())
      .get(`/v1/quizzes/sections/${sectionId}/result`)
      .set('x-user-id', 'unknown-user-id-not-created')
      .expect(400);
  });

  it('GET latest/result return 404 for invalid section', async () => {
    await request(app.getHttpServer())
      .get('/v1/quizzes/sections/nonexistent-section-id/attempts/latest')
      .set('x-user-id', userIds.fresh)
      .expect(404);

    await request(app.getHttpServer())
      .get('/v1/quizzes/sections/nonexistent-section-id/result')
      .set('x-user-id', userIds.fresh)
      .expect(404);
  });
});

function getCorrectOption(answerKeyJson: unknown): string {
  if (!answerKeyJson || typeof answerKeyJson !== 'object' || Array.isArray(answerKeyJson)) {
    throw new Error('Invalid seeded answerKeyJson');
  }

  const correct = (answerKeyJson as { correct_option?: unknown }).correct_option;
  if (typeof correct !== 'string' || correct.trim().length === 0) {
    throw new Error('Invalid seeded correct_option');
  }

  return correct;
}
