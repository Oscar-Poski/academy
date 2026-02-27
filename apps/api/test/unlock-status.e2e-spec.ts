import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, QuestionType } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Unlock Status API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seededModuleId: string;
  let prerequisiteSectionId: string;
  let seededPathId: string;
  let seededQuestions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }> = [];

  const userIds = {
    locked: 'unlock-status-locked-user',
    unlocked: 'unlock-status-unlocked-user',
    fresh: 'unlock-status-fresh-user'
  } as const;

  const createdTempModuleIds: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const module = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true, pathId: true }
    });
    if (!module) {
      throw new Error('Seeded module not found. Run API migrate + seed before tests.');
    }
    seededModuleId = module.id;
    seededPathId = module.pathId;

    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    if (!section) {
      throw new Error('Seeded prerequisite section not found. Run API migrate + seed before tests.');
    }
    prerequisiteSectionId = section.id;

    const sectionVersion = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId: section.id,
          versionNumber: 1
        }
      },
      select: { id: true }
    });
    if (!sectionVersion) {
      throw new Error('Seeded section version not found for unlock status tests.');
    }

    seededQuestions = await prisma.question.findMany({
      where: { sectionVersionId: sectionVersion.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        answerKeyJson: true
      }
    });
    if (seededQuestions.length === 0) {
      throw new Error('Expected seeded quiz questions for unlock status tests.');
    }

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `unlock-status-test-${index}@academy.local` },
          update: { id, name: `Unlock Status Test ${index}` },
          create: {
            id,
            email: `unlock-status-test-${index}@academy.local`,
            name: `Unlock Status Test ${index}`
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
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
  });

  afterEach(async () => {
    for (const moduleId of createdTempModuleIds.splice(0)) {
      await prisma.unlockRule.deleteMany({
        where: {
          scopeType: 'module',
          scopeId: moduleId
        }
      });
      await prisma.module.deleteMany({
        where: { id: moduleId }
      });
    }
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
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('returns locked before prerequisite completion', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${seededModuleId}/status`)
      .set('x-user-id', userIds.locked)
      .expect(200);

    expect(response.body.moduleId).toBe(seededModuleId);
    expect(response.body.isUnlocked).toBe(false);
    expect(Array.isArray(response.body.reasons)).toBe(true);
    expect(response.body.reasons).toContain(`Complete prerequisite section: ${prerequisiteSectionId}`);
    expect(response.body.requiresCredits).toBe(false);
    expect(response.body.creditsCost).toBe(0);
  });

  it('returns unlocked after prerequisite completion', async () => {
    await submitPassingQuizAttempt(app, userIds.unlocked, prerequisiteSectionId, seededQuestions);

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${prerequisiteSectionId}/complete`)
      .set('x-user-id', userIds.unlocked)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${seededModuleId}/status`)
      .set('x-user-id', userIds.unlocked)
      .expect(200);

    expect(response.body.moduleId).toBe(seededModuleId);
    expect(response.body.isUnlocked).toBe(true);
    expect(response.body.reasons).toEqual([]);
  });

  it('rejects missing or unknown user header', async () => {
    await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${seededModuleId}/status`)
      .expect(400);

    await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${seededModuleId}/status`)
      .set('x-user-id', 'unknown-unlock-status-user')
      .expect(400);
  });

  it('returns 404 for unknown module', async () => {
    await request(app.getHttpServer())
      .get('/v1/unlocks/modules/nonexistent-module-id/status')
      .set('x-user-id', userIds.fresh)
      .expect(404);
  });

  it('returns unlocked for module with no active rules', async () => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempModule = await prisma.module.create({
      data: {
        pathId: seededPathId,
        slug: `unlock-status-temp-module-${unique}`,
        title: `Unlock Status Temp Module ${unique}`,
        description: 'Temporary module for unlock status e2e test',
        sortOrder: 9990,
        status: 'published'
      }
    });
    createdTempModuleIds.push(tempModule.id);

    const response = await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${tempModule.id}/status`)
      .set('x-user-id', userIds.fresh)
      .expect(200);

    expect(response.body.moduleId).toBe(tempModule.id);
    expect(response.body.isUnlocked).toBe(true);
    expect(response.body.reasons).toEqual([]);
  });

  it('returns unlocked when a persisted module unlock grant exists', async () => {
    await prisma.userUnlock.create({
      data: {
        userId: userIds.locked,
        scopeType: 'module',
        scopeId: seededModuleId,
        reason: 'test_grant'
      }
    });

    const response = await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${seededModuleId}/status`)
      .set('x-user-id', userIds.locked)
      .expect(200);

    expect(response.body.moduleId).toBe(seededModuleId);
    expect(response.body.isUnlocked).toBe(true);
    expect(response.body.reasons).toEqual([]);
  });
});

async function submitPassingQuizAttempt(
  app: INestApplication,
  userId: string,
  sectionId: string,
  questions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }>
): Promise<void> {
  const answers = questions.map((question) => {
    if (question.type === QuestionType.mcq) {
      return {
        question_id: question.id,
        selected_option: getCorrectOption(question.answerKeyJson)
      };
    }

    return {
      question_id: question.id,
      answer_text: getCorrectShortAnswer(question.answerKeyJson)
    };
  });

  await request(app.getHttpServer())
    .post(`/v1/quizzes/sections/${sectionId}/attempts`)
    .set('x-user-id', userId)
    .send({ answers })
    .expect(201);
}

function getCorrectOption(answerKeyJson: unknown): string {
  if (!answerKeyJson || typeof answerKeyJson !== 'object' || Array.isArray(answerKeyJson)) {
    throw new Error('Invalid seeded answer key JSON for MCQ');
  }

  const value = (answerKeyJson as { correct_option?: unknown }).correct_option;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Invalid seeded correct_option');
  }

  return value;
}

function getCorrectShortAnswer(answerKeyJson: unknown): string {
  if (!answerKeyJson || typeof answerKeyJson !== 'object' || Array.isArray(answerKeyJson)) {
    throw new Error('Invalid seeded answer key JSON for short answer');
  }

  const mode = (answerKeyJson as { mode?: unknown }).mode;
  if (mode === 'exact' || mode === 'exact_ci') {
    const accepted = (answerKeyJson as { accepted?: unknown }).accepted;
    if (!Array.isArray(accepted) || accepted.length === 0) {
      throw new Error('Invalid seeded accepted answers');
    }
    const first = accepted.find((value) => typeof value === 'string' && value.trim().length > 0);
    if (typeof first !== 'string') {
      throw new Error('Invalid seeded accepted answer value');
    }
    return first;
  }

  if (mode === 'regex') {
    const pattern = (answerKeyJson as { pattern?: unknown }).pattern;
    const flags = (answerKeyJson as { flags?: unknown }).flags;
    if (typeof pattern !== 'string') {
      throw new Error('Invalid seeded regex pattern');
    }
    const compiled = new RegExp(pattern, typeof flags === 'string' ? flags : '');
    const candidates = ['host', 'answer', 'test', 'academy'];
    const match = candidates.find((candidate) => compiled.test(candidate));
    if (!match) {
      throw new Error('Unable to derive matching value for seeded regex question');
    }
    return match;
  }

  throw new Error('Unsupported seeded short-answer mode');
}
