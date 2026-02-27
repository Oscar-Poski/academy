import { INestApplication } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Gamification API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let quizSectionId: string;
  let quizSectionVersionId: string;
  let quizQuestions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }> = [];
  let tempModuleId: string;
  let tempSectionId: string;

  const userIds = {
    fresh: 'gamification-fresh-user',
    complete: 'gamification-complete-user',
    quiz: 'gamification-quiz-user',
    combined: 'gamification-combined-user'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const seededSection = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    if (!seededSection) {
      throw new Error('Seeded section request-response-cycle not found.');
    }
    quizSectionId = seededSection.id;

    const seededVersion = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId: quizSectionId,
          versionNumber: 1
        }
      },
      select: { id: true }
    });
    if (!seededVersion) {
      throw new Error('Seeded section version request-response-cycle v1 not found.');
    }
    quizSectionVersionId = seededVersion.id;

    quizQuestions = await prisma.question.findMany({
      where: { sectionVersionId: quizSectionVersionId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        answerKeyJson: true
      }
    });
    if (quizQuestions.length === 0) {
      throw new Error('Expected seeded quiz questions for gamification tests.');
    }

    const path = await prisma.path.findUnique({
      where: { slug: 'web-pentest-path' },
      select: { id: true }
    });
    if (!path) {
      throw new Error('Seeded path web-pentest-path not found.');
    }

    const unique = Date.now().toString(36);
    const tempModule = await prisma.module.create({
      data: {
        pathId: path.id,
        slug: `gamification-temp-module-${unique}`,
        title: 'Gamification Temp Module',
        description: 'Temporary module for gamification e2e tests',
        sortOrder: 9999,
        status: 'draft',
        creditsCost: 0
      },
      select: { id: true }
    });
    tempModuleId = tempModule.id;

    const tempSection = await prisma.section.create({
      data: {
        moduleId: tempModuleId,
        slug: `gamification-temp-section-${unique}`,
        title: 'Gamification Temp Section',
        sortOrder: 1,
        hasQuiz: false
      },
      select: { id: true }
    });
    tempSectionId = tempSection.id;

    await prisma.sectionVersion.create({
      data: {
        sectionId: tempSectionId,
        versionNumber: 1,
        status: 'published',
        changeLog: 'Initial published version'
      }
    });

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `gamification-test-${index}@academy.local` },
          update: { id, name: `Gamification Test ${index}` },
          create: {
            id,
            email: `gamification-test-${index}@academy.local`,
            name: `Gamification Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
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
    await prisma.xpEvent.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
    await prisma.userLevel.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
  });

  afterAll(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
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
    await prisma.xpEvent.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });
    await prisma.userLevel.deleteMany({
      where: {
        userId: { in: Object.values(userIds) }
      }
    });

    if (tempSectionId) {
      await prisma.section.deleteMany({
        where: { id: tempSectionId }
      });
    }
    if (tempModuleId) {
      await prisma.module.deleteMany({
        where: { id: tempModuleId }
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('returns zero XP and level 1 for a fresh known user', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', bearerToken(userIds.fresh))
      .expect(200);

    expect(response.body).toEqual({
      userId: userIds.fresh,
      totalXp: 0,
      level: 1
    });
  });

  it('awards section completion XP exactly once', async () => {
    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${tempSectionId}/complete`)
      .set('Authorization', bearerToken(userIds.complete))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${tempSectionId}/complete`)
      .set('Authorization', bearerToken(userIds.complete))
      .expect(201);

    const events = await prisma.xpEvent.findMany({
      where: {
        userId: userIds.complete,
        eventType: 'section_complete'
      }
    });
    expect(events).toHaveLength(1);

    const summary = await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', bearerToken(userIds.complete))
      .expect(200);

    expect(summary.body.totalXp).toBe(50);
    expect(summary.body.level).toBe(1);
  });

  it('awards quiz pass XP exactly once per section', async () => {
    await submitQuizAttempt(userIds.quiz, buildAllWrongAnswers());
    await submitQuizAttempt(userIds.quiz, buildAllCorrectAnswers());
    await submitQuizAttempt(userIds.quiz, buildAllCorrectAnswers());

    const quizPassEvents = await prisma.xpEvent.findMany({
      where: {
        userId: userIds.quiz,
        eventType: 'quiz_pass'
      }
    });
    expect(quizPassEvents).toHaveLength(1);

    const summary = await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', bearerToken(userIds.quiz))
      .expect(200);

    expect(summary.body.totalXp).toBe(100);
    expect(summary.body.level).toBe(2);
  });

  it('accumulates section + quiz XP and updates level', async () => {
    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${tempSectionId}/complete`)
      .set('Authorization', bearerToken(userIds.combined))
      .expect(201);

    await submitQuizAttempt(userIds.combined, buildAllCorrectAnswers());

    const summary = await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', bearerToken(userIds.combined))
      .expect(200);

    expect(summary.body.totalXp).toBe(150);
    expect(summary.body.level).toBe(2);

    const allEvents = await prisma.xpEvent.findMany({
      where: { userId: userIds.combined }
    });
    expect(allEvents).toHaveLength(2);
  });

  it('validates bearer auth', async () => {
    await request(app.getHttpServer()).get('/v1/gamification/me').expect(401);

    await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', bearerToken('unknown-gamification-user'))
      .expect(400);
  });

  function buildAllCorrectAnswers(): Array<{
    question_id: string;
    selected_option?: string;
    answer_text?: string;
  }> {
    return quizQuestions.map((question) => {
      if (question.type === QuestionType.mcq) {
        return {
          question_id: question.id,
          selected_option: extractCorrectOption(question.answerKeyJson, question.id)
        };
      }

      return {
        question_id: question.id,
        answer_text: extractShortAnswer(question.answerKeyJson, question.id)
      };
    });
  }

  function buildAllWrongAnswers(): Array<{
    question_id: string;
    selected_option?: string;
    answer_text?: string;
  }> {
    return quizQuestions.map((question) => {
      if (question.type === QuestionType.mcq) {
        return {
          question_id: question.id,
          selected_option: 'definitely-wrong-option'
        };
      }

      return {
        question_id: question.id,
        answer_text: 'definitely-wrong-answer'
      };
    });
  }

  async function submitQuizAttempt(
    userId: string,
    answers: Array<{ question_id: string; selected_option?: string; answer_text?: string }>
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${quizSectionId}/attempts`)
      .set('Authorization', bearerToken(userId))
      .send({ answers })
      .expect(201);
  }

  function extractCorrectOption(answerKeyJson: unknown, questionId: string): string {
    if (typeof answerKeyJson !== 'object' || answerKeyJson == null || Array.isArray(answerKeyJson)) {
      throw new Error(`Invalid answerKeyJson for question ${questionId}`);
    }

    const correctOption = (answerKeyJson as { correct_option?: unknown }).correct_option;
    if (typeof correctOption !== 'string' || correctOption.trim().length === 0) {
      throw new Error(`Missing correct_option for question ${questionId}`);
    }

    return correctOption;
  }

  function extractShortAnswer(answerKeyJson: unknown, questionId: string): string {
    if (typeof answerKeyJson !== 'object' || answerKeyJson == null || Array.isArray(answerKeyJson)) {
      throw new Error(`Invalid answerKeyJson for question ${questionId}`);
    }

    const accepted = (answerKeyJson as { accepted?: unknown }).accepted;
    if (!Array.isArray(accepted) || accepted.length === 0) {
      throw new Error(`Missing accepted answers for short-answer question ${questionId}`);
    }

    const first = accepted[0];
    if (typeof first !== 'string' || first.trim().length === 0) {
      throw new Error(`Invalid accepted answer value for question ${questionId}`);
    }

    return first;
  }
});
