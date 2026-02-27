import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaClient, QuestionType, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth user-context bridge (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  let moduleId: string;
  let sectionId: string;
  let sectionVersionId: string;
  let quizQuestions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }> = [];

  const users = {
    bearer: {
      id: 'auth-bridge-bearer-user',
      email: 'auth-bridge-bearer@academy.local',
      password: 'password123'
    },
    header: {
      id: 'auth-bridge-header-user',
      email: 'auth-bridge-header@academy.local',
      password: 'password123'
    },
    fresh: {
      id: 'auth-bridge-fresh-user',
      email: 'auth-bridge-fresh@academy.local',
      password: 'password123'
    }
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const seededModule = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    const seededSection = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });

    if (!seededModule || !seededSection) {
      throw new Error('Seeded module/section missing. Run API migrate+seed first.');
    }

    moduleId = seededModule.id;
    sectionId = seededSection.id;

    const version = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId,
          versionNumber: 1
        }
      },
      select: { id: true }
    });
    if (!version) {
      throw new Error('Seeded section version not found.');
    }
    sectionVersionId = version.id;

    quizQuestions = await prisma.question.findMany({
      where: { sectionVersionId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true, type: true, answerKeyJson: true }
    });

    if (quizQuestions.length === 0) {
      throw new Error('Seeded quiz questions missing.');
    }

    await Promise.all(
      Object.values(users).map(async (user) => {
        const passwordHash = await hash(user.password, 10);
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            id: user.id,
            name: user.email,
            role: UserRole.user,
            passwordHash
          },
          create: {
            id: user.id,
            email: user.email,
            name: user.email,
            role: UserRole.user,
            passwordHash
          }
        });
      })
    );
  });

  beforeEach(async () => {
    const userIds = Object.values(users).map((u) => u.id);

    await prisma.quizAttemptAnswer.deleteMany({
      where: {
        attempt: {
          userId: { in: userIds }
        }
      }
    });
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userUnlock.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userSectionProgress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.authRefreshToken.deleteMany({ where: { userId: { in: userIds } } });
  });

  afterAll(async () => {
    const userIds = Object.values(users).map((u) => u.id);

    await prisma.quizAttemptAnswer.deleteMany({
      where: {
        attempt: {
          userId: { in: userIds }
        }
      }
    });
    await prisma.quizAttempt.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userUnlock.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userSectionProgress.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.authRefreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    await app.close();
    await prisma.$disconnect();
  });

  it('supports bearer-only identity on progress/quiz/unlocks/gamification routes', async () => {
    const bearerToken = await login(users.bearer.email, users.bearer.password);

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/start`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(201);

    const quizAttempt = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .send({ answers: buildCorrectAnswers(quizQuestions) })
      .expect(201);
    expect(quizAttempt.body.userId).toBe(users.bearer.id);

    await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${moduleId}/status`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(200);

    const gamification = await request(app.getHttpServer())
      .get('/v1/gamification/me')
      .set('Authorization', `Bearer ${bearerToken}`)
      .expect(200);
    expect(gamification.body.userId).toBe(users.bearer.id);
  });

  it('uses bearer principal over conflicting x-user-id', async () => {
    const bearerToken = await login(users.bearer.email, users.bearer.password);

    const attempt = await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('Authorization', `Bearer ${bearerToken}`)
      .set('x-user-id', users.header.id)
      .send({ answers: buildCorrectAnswers(quizQuestions) })
      .expect(201);

    expect(attempt.body.userId).toBe(users.bearer.id);

    const headerUserAttempts = await prisma.quizAttempt.count({
      where: { userId: users.header.id, sectionId }
    });
    expect(headerUserAttempts).toBe(0);
  });

  it('keeps legacy x-user-id fallback behavior when bearer is absent', async () => {
    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/start`)
      .set('x-user-id', users.header.id)
      .expect(201);

    const progress = await prisma.userSectionProgress.findUnique({
      where: {
        userId_sectionId: {
          userId: users.header.id,
          sectionId
        }
      },
      select: { userId: true }
    });

    expect(progress?.userId).toBe(users.header.id);
  });

  it('preserves existing 400 behavior when both bearer and x-user-id are missing', async () => {
    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/start`)
      .expect(400);
  });

  async function login(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/v1/auth/login').send({ email, password });
    if (response.status !== 200 || typeof response.body.access_token !== 'string') {
      throw new Error(`login failed for ${email}`);
    }

    return response.body.access_token;
  }

  function buildCorrectAnswers(
    questions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }>
  ): Array<{ question_id: string; selected_option?: string; answer_text?: string }> {
    return questions.map((question) => {
      if (question.type === QuestionType.mcq) {
        const key = question.answerKeyJson as { correct_option?: unknown };
        return {
          question_id: question.id,
          selected_option: typeof key.correct_option === 'string' ? key.correct_option : ''
        };
      }

      const key = question.answerKeyJson as {
        mode?: string;
        accepted?: unknown;
        pattern?: unknown;
        value?: unknown;
      };

      if (key.mode === 'regex' && typeof key.pattern === 'string') {
        return {
          question_id: question.id,
          answer_text: 'GET'
        };
      }

      if (Array.isArray(key.accepted) && typeof key.accepted[0] === 'string') {
        return {
          question_id: question.id,
          answer_text: key.accepted[0]
        };
      }

      return {
        question_id: question.id,
        answer_text: typeof key.value === 'string' ? key.value : ''
      };
    });
  }
});
