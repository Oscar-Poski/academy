import { INestApplication } from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Quiz Attempts API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let sectionId: string;
  let sectionVersionId: string;
  let mcqQuestions: Array<{
    id: string;
    points: number;
    answerKeyJson: unknown;
  }>;

  const userIds = {
    happy: 'quiz-attempt-happy-user',
    mixed: 'quiz-attempt-mixed-user',
    unanswered: 'quiz-attempt-unanswered-user',
    duplicate: 'quiz-attempt-duplicate-user',
    unknownQuestion: 'quiz-attempt-unknown-question-user',
    increment: 'quiz-attempt-increment-user'
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
    sectionVersionId = version.id;

    mcqQuestions = await prisma.question.findMany({
      where: {
        sectionVersionId,
        type: QuestionType.mcq
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        points: true,
        answerKeyJson: true
      }
    });

    if (mcqQuestions.length < 2) {
      throw new Error('Expected at least 2 seeded MCQ questions for request-response-cycle v1.');
    }

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `quiz-attempt-test-${index}@academy.local` },
          update: { id, name: `Quiz Attempt Test ${index}` },
          create: {
            id,
            email: `quiz-attempt-test-${index}@academy.local`,
            name: `Quiz Attempt Test ${index}`
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

  it('submits a happy-path all-correct MCQ attempt', async () => {
    const answers = mcqQuestions.map((question) => ({
      question_id: question.id,
      selected_option: getCorrectOption(question.answerKeyJson)
    }));

    const response = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.happy)
      .send({ answers })
      .expect(201);

    const expectedMax = mcqQuestions.reduce((sum, question) => sum + question.points, 0);

    expect(response.body.userId).toBe(userIds.happy);
    expect(response.body.sectionId).toBe(sectionId);
    expect(response.body.sectionVersionId).toBe(sectionVersionId);
    expect(response.body.attemptNo).toBe(1);
    expect(response.body.score).toBe(expectedMax);
    expect(response.body.maxScore).toBe(expectedMax);
    expect(response.body.passed).toBe(true);
    expect(Array.isArray(response.body.feedback)).toBe(true);
    expect(response.body.feedback).toHaveLength(mcqQuestions.length);

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: userIds.happy, sectionId },
      orderBy: [{ attemptNo: 'asc' }]
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].attemptNo).toBe(1);

    const savedAnswers = await prisma.quizAttemptAnswer.findMany({
      where: { attemptId: attempts[0].id }
    });
    expect(savedAnswers).toHaveLength(mcqQuestions.length);
  });

  it('scores mixed correct/incorrect answers and can fail threshold', async () => {
    const answers = [
      {
        question_id: mcqQuestions[0].id,
        selected_option: getCorrectOption(mcqQuestions[0].answerKeyJson)
      },
      {
        question_id: mcqQuestions[1].id,
        selected_option: '__incorrect__'
      }
    ];

    const response = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.mixed)
      .send({ answers })
      .expect(201);

    expect(response.body.maxScore).toBeGreaterThan(0);
    expect(response.body.score).toBeLessThan(response.body.maxScore);
    expect(response.body.passed).toBe(false);
    expect(response.body.feedback.some((item: { isCorrect: boolean }) => item.isCorrect)).toBe(true);
    expect(response.body.feedback.some((item: { isCorrect: boolean }) => !item.isCorrect)).toBe(true);

    const attempt = await prisma.quizAttempt.findFirst({
      where: { userId: userIds.mixed, sectionId }
    });
    expect(attempt).toBeTruthy();
    expect(attempt?.score).toBe(response.body.score);
  });

  it('treats unanswered MCQ as incorrect with selectedOption null', async () => {
    const answers = [
      {
        question_id: mcqQuestions[0].id,
        selected_option: getCorrectOption(mcqQuestions[0].answerKeyJson)
      }
    ];

    const response = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.unanswered)
      .send({ answers })
      .expect(201);

    const missingFeedback = response.body.feedback.find(
      (item: { questionId: string }) => item.questionId === mcqQuestions[1].id
    );
    expect(missingFeedback).toBeTruthy();
    expect(missingFeedback.isCorrect).toBe(false);
    expect(missingFeedback.selectedOption).toBeNull();
    expect(missingFeedback.awardedPoints).toBe(0);
  });

  it('rejects duplicate question_id in payload', async () => {
    const questionId = mcqQuestions[0].id;

    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.duplicate)
      .send({
        answers: [
          { question_id: questionId, selected_option: 'GET' },
          { question_id: questionId, selected_option: 'POST' }
        ]
      })
      .expect(400);
  });

  it('rejects unknown question_id in payload', async () => {
    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.unknownQuestion)
      .send({
        answers: [{ question_id: 'unknown-question-id', selected_option: 'GET' }]
      })
      .expect(400);
  });

  it('increments attempt number for repeated submissions by same user/section', async () => {
    const answers = mcqQuestions.map((question) => ({
      question_id: question.id,
      selected_option: getCorrectOption(question.answerKeyJson)
    }));

    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.increment)
      .send({ answers })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userIds.increment)
      .send({ answers })
      .expect(201);

    expect(second.body.attemptNo).toBe(2);

    const attempts = await prisma.quizAttempt.findMany({
      where: { userId: userIds.increment, sectionId },
      orderBy: [{ attemptNo: 'asc' }],
      select: { attemptNo: true }
    });
    expect(attempts.map((attempt) => attempt.attemptNo)).toEqual([1, 2]);
  });

  it('rejects missing or unknown x-user-id', async () => {
    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .send({ answers: [] })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', 'unknown-user-id')
      .send({ answers: [] })
      .expect(400);
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
