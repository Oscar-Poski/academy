import { INestApplication } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Progress Completion Gating API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let moduleId: string;
  let sectionId: string;
  let sectionVersionId: string;
  let tempRuleSectionId: string | null = null;
  let createdRuleIds: string[] = [];
  let scorableQuestions: Array<{ id: string; type: QuestionType; answerKeyJson: unknown }> = [];

  const userIds = {
    noAttempt: 'progress-gating-no-attempt-user',
    failedAttempt: 'progress-gating-failed-user',
    passedAttempt: 'progress-gating-passed-user',
    idempotent: 'progress-gating-idempotent-user',
    unlockBlocked: 'progress-gating-unlock-blocked-user'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const module = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    if (!module) {
      throw new Error('Seeded module not found. Run API migrate + seed before tests.');
    }
    moduleId = module.id;

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
      select: { id: true }
    });
    if (!version) {
      throw new Error('Seeded section version not found for request-response-cycle v1.');
    }
    sectionVersionId = version.id;

    scorableQuestions = await prisma.question.findMany({
      where: { sectionVersionId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        type: true,
        answerKeyJson: true
      }
    });
    if (scorableQuestions.length === 0) {
      throw new Error('Expected seeded quiz questions for request-response-cycle.');
    }

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `progress-gating-test-${index}@academy.local` },
          update: { id, name: `Progress Gating Test ${index}` },
          create: {
            id,
            email: `progress-gating-test-${index}@academy.local`,
            name: `Progress Gating Test ${index}`
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
    await prisma.userUnlock.deleteMany({
      where: {
        userId: { in: Object.values(userIds) },
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    if (createdRuleIds.length > 0) {
      await prisma.unlockRule.deleteMany({
        where: { id: { in: createdRuleIds } }
      });
      createdRuleIds = [];
    }
    if (tempRuleSectionId) {
      await prisma.section.deleteMany({
        where: { id: tempRuleSectionId }
      });
      tempRuleSectionId = null;
    }
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
    await prisma.userUnlock.deleteMany({
      where: {
        userId: { in: Object.values(userIds) },
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    if (createdRuleIds.length > 0) {
      await prisma.unlockRule.deleteMany({
        where: { id: { in: createdRuleIds } }
      });
    }
    if (tempRuleSectionId) {
      await prisma.section.deleteMany({
        where: { id: tempRuleSectionId }
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('blocks completion when quiz is required and no attempts exist', async () => {
    const response = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.noAttempt))
      .expect(409);

    expect(response.body.code).toBe('completion_blocked');
    expect(response.body.requiresQuizPass).toBe(true);
    expect(response.body.reasons).toContain('Pass quiz before completing this section.');
  });

  it('blocks completion when latest quiz attempt failed', async () => {
    await submitAttempt(userIds.failedAttempt, buildAllWrongAnswers());

    const response = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.failedAttempt))
      .expect(409);

    expect(response.body.code).toBe('completion_blocked');
    expect(response.body.requiresQuizPass).toBe(true);
    expect(response.body.reasons).toContain('Pass quiz before completing this section.');
  });

  it('allows completion after passing quiz', async () => {
    await submitAttempt(userIds.passedAttempt, buildAllCorrectAnswers());

    const response = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.passedAttempt))
      .expect(201);

    expect(response.body.status).toBe('completed');
    expect(response.body.completionPct).toBe(100);
  });

  it('complete remains idempotent after successful completion', async () => {
    await submitAttempt(userIds.idempotent, buildAllCorrectAnswers());

    const first = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.idempotent))
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.idempotent))
      .expect(201);

    expect(first.body.status).toBe('completed');
    expect(second.body.status).toBe('completed');
    expect(second.body.completedAt).toBe(first.body.completedAt);
  });

  it('blocks completion on non-self unlock prerequisite reasons', async () => {
    await submitAttempt(userIds.unlockBlocked, buildAllCorrectAnswers());

    tempRuleSectionId = await createTempPrereqSection();
    const rule = await prisma.unlockRule.create({
      data: {
        scopeType: 'module',
        scopeId: moduleId,
        ruleType: 'prereq_sections',
        ruleConfigJson: { section_ids: [tempRuleSectionId] },
        isActive: true,
        priority: 999
      },
      select: { id: true }
    });
    createdRuleIds.push(rule.id);

    const response = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.unlockBlocked))
      .expect(409);

    expect(response.body.code).toBe('completion_blocked');
    expect(response.body.requiresUnlock).toBe(true);
    expect(response.body.reasons).toContain(`Complete prerequisite section: ${tempRuleSectionId}`);
  });

  it('does not deadlock on self-prerequisite unlock reason', async () => {
    await submitAttempt(userIds.passedAttempt, buildAllCorrectAnswers());

    const response = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${sectionId}/complete`)
      .set('Authorization', bearerToken(userIds.passedAttempt))
      .expect(201);

    expect(response.body.status).toBe('completed');
    expect(response.body.completionPct).toBe(100);
  });

  async function createTempPrereqSection(): Promise<string> {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const section = await prisma.section.create({
      data: {
        moduleId,
        slug: `progress-gating-prereq-${unique}`,
        title: `Progress Gating Prereq ${unique}`,
        sortOrder: 9900,
        hasQuiz: false
      },
      select: { id: true }
    });
    return section.id;
  }

  async function submitAttempt(
    userId: string,
    answers: Array<{ question_id: string; selected_option?: string; answer_text?: string }>
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/v1/quizzes/sections/${sectionId}/attempts`)
      .set('Authorization', bearerToken(userId))
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
