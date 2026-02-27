import { INestApplication } from '@nestjs/common';
import { QuestionType, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Unlock Evaluate API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let moduleId: string;
  let sectionId: string;
  let scorableQuestions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }>;

  const userIds = {
    unmet: 'unlock-evaluate-unmet-user',
    failed: 'unlock-evaluate-failed-user',
    passed: 'unlock-evaluate-passed-user',
    missing: 'unlock-evaluate-missing-user',
    unknown: 'unlock-evaluate-unknown-user'
  } as const;

  const createdRuleIds: string[] = [];

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
    if (!seededModule) {
      throw new Error('Seeded module not found. Run API migrate + seed before tests.');
    }
    moduleId = seededModule.id;

    const seededSection = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    if (!seededSection) {
      throw new Error('Seeded section not found. Run API migrate + seed before tests.');
    }
    sectionId = seededSection.id;

    const version = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId,
          versionNumber: 1
        }
      },
      select: {
        id: true,
        status: true
      }
    });
    if (!version || version.status !== SectionVersionStatus.published) {
      throw new Error('Expected published request-response-cycle v1 section version.');
    }
    scorableQuestions = await prisma.question.findMany({
      where: {
        sectionVersionId: version.id
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        answerKeyJson: true
      }
    });
    if (scorableQuestions.length === 0) {
      throw new Error('Expected seeded quiz questions.');
    }

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `unlock-evaluate-test-${index}@academy.local` },
          update: { id, name: `Unlock Evaluate Test ${index}` },
          create: {
            id,
            email: `unlock-evaluate-test-${index}@academy.local`,
            name: `Unlock Evaluate Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
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
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.unlockRule.deleteMany({
      where: { id: { in: createdRuleIds.splice(0) } }
    });
  });

  afterAll(async () => {
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
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
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.unlockRule.deleteMany({
      where: { id: { in: createdRuleIds.splice(0) } }
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('denies evaluate when quiz-pass rule is unmet', async () => {
    await createQuizPassRule();

    const response = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', userIds.unmet)
      .expect(200);

    expect(response.body.moduleId).toBe(moduleId);
    expect(response.body.isUnlocked).toBe(false);
    expect(response.body.reasons).toContain(`Pass quiz for section: ${sectionId}`);

    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.unmet,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(unlockRows).toHaveLength(0);
  });

  it('denies evaluate when latest quiz attempt failed', async () => {
    await createQuizPassRule();
    await completePrerequisite(userIds.failed);
    await submitAttempt(userIds.failed, buildAllWrongAnswers());

    const response = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', userIds.failed)
      .expect(200);

    expect(response.body.isUnlocked).toBe(false);
    expect(response.body.reasons).toContain(`Pass quiz for section: ${sectionId}`);

    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.failed,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(unlockRows).toHaveLength(0);
  });

  it('persists unlock when latest quiz attempt passed', async () => {
    await createQuizPassRule();
    await completePrerequisite(userIds.passed);
    await submitAttempt(userIds.passed, buildAllCorrectAnswers());

    const response = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', userIds.passed)
      .expect(200);

    expect(response.body.moduleId).toBe(moduleId);
    expect(response.body.isUnlocked).toBe(true);
    expect(response.body.reasons).toEqual([]);

    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.passed,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(unlockRows).toHaveLength(1);
  });

  it('evaluate is idempotent after unlock is persisted', async () => {
    await createQuizPassRule();
    await completePrerequisite(userIds.passed);
    await submitAttempt(userIds.passed, buildAllCorrectAnswers());

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', userIds.passed)
      .expect(200);

    const second = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', userIds.passed)
      .expect(200);

    expect(second.body.isUnlocked).toBe(true);
    expect(second.body.reasons).toEqual([]);

    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.passed,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(unlockRows).toHaveLength(1);
  });

  it('rejects missing or unknown x-user-id', async () => {
    await request(app.getHttpServer()).post(`/v1/unlocks/modules/${moduleId}/evaluate`).expect(400);

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('x-user-id', 'unknown-user-id-not-created')
      .expect(400);
  });

  it('returns 404 for unknown module', async () => {
    await request(app.getHttpServer())
      .post('/v1/unlocks/modules/nonexistent-module-id/evaluate')
      .set('x-user-id', userIds.missing)
      .expect(404);
  });

  async function createQuizPassRule(): Promise<void> {
    const rule = await prisma.unlockRule.create({
      data: {
        scopeType: 'module',
        scopeId: moduleId,
        ruleType: 'quiz_pass',
        ruleConfigJson: {
          section_ids: [sectionId]
        },
        isActive: true,
        priority: 9
      },
      select: { id: true }
    });
    createdRuleIds.push(rule.id);
  }

  async function completePrerequisite(userId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('x-user-id', userId)
      .expect(201);
  }

  async function submitAttempt(
    userId: string,
    answers: Array<{ question_id: string; selected_option?: string; answer_text?: string }>
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('x-user-id', userId)
      .send({ answers })
      .expect(201);
  }

  function buildAllCorrectAnswers(): Array<{
    question_id: string;
    selected_option?: string;
    answer_text?: string;
  }> {
    return scorableQuestions.map((question) => {
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
  }

  function buildAllWrongAnswers(): Array<{
    question_id: string;
    selected_option?: string;
    answer_text?: string;
  }> {
    return scorableQuestions.map((question) => {
      if (question.type === QuestionType.mcq) {
        return {
          question_id: question.id,
          selected_option: '__wrong_option__'
        };
      }

      return {
        question_id: question.id,
        answer_text: '__wrong_answer__'
      };
    });
  }
});

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
