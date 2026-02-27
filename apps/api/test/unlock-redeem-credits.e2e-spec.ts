import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Unlock Redeem Credits API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let moduleId: string;
  let tempModuleId: string | null = null;
  let prerequisiteSectionId: string;

  const userIds = {
    blocked: 'unlock-redeem-blocked-user',
    insufficient: 'unlock-redeem-insufficient-user',
    enough: 'unlock-redeem-enough-user'
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
      select: { id: true, pathId: true }
    });
    if (!seededModule) {
      throw new Error('Seeded module not found. Run API migrate + seed before tests.');
    }

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempModule = await prisma.module.create({
      data: {
        pathId: seededModule.pathId,
        slug: `unlock-redeem-temp-module-${unique}`,
        title: `Unlock Redeem Temp Module ${unique}`,
        description: 'Temporary module for unlock redeem e2e tests',
        sortOrder: 9992,
        status: 'published',
        creditsCost: 100
      },
      select: { id: true }
    });
    tempModuleId = tempModule.id;
    moduleId = tempModule.id;

    const seededSection = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    if (!seededSection) {
      throw new Error('Seeded prerequisite section not found.');
    }
    prerequisiteSectionId = seededSection.id;

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `unlock-redeem-test-${index}@academy.local` },
          update: { id, name: `Unlock Redeem Test ${index}` },
          create: {
            id,
            email: `unlock-redeem-test-${index}@academy.local`,
            name: `Unlock Redeem Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.creditEvent.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userCredit.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.unlockRule.deleteMany({
      where: { id: { in: createdRuleIds.splice(0) } }
    });

    await createCreditsRule();
  });

  afterAll(async () => {
    await prisma.userUnlock.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.creditEvent.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userCredit.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.unlockRule.deleteMany({
      where: { id: { in: createdRuleIds.splice(0) } }
    });

    if (tempModuleId) {
      await prisma.module.deleteMany({
        where: { id: tempModuleId }
      });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('status/evaluate show credits-gated reason instead of unsupported-rule reason', async () => {
    const status = await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${moduleId}/status`)
      .set('Authorization', bearerToken(userIds.blocked))
      .expect(200);

    expect(status.body.isUnlocked).toBe(false);
    expect(status.body.reasons).toContain(`Redeem credits to unlock module: ${moduleId}`);
    expect(status.body.reasons.some((reason: string) => reason.includes('Unsupported unlock rule'))).toBe(false);

    const evaluate = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('Authorization', bearerToken(userIds.blocked))
      .expect(200);

    expect(evaluate.body.isUnlocked).toBe(false);
    expect(evaluate.body.reasons).toContain(`Redeem credits to unlock module: ${moduleId}`);
  });

  it('rejects redeem without bearer', async () => {
    await request(app.getHttpServer()).post(`/v1/unlocks/modules/${moduleId}/redeem-credits`).expect(401);
  });

  it('rejects redeem for unknown user', async () => {
    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken('unlock-redeem-user-not-created'))
      .expect(400);
  });

  it('redeem returns unlock_blocked and spends nothing when non-credit prereq is unmet', async () => {
    await createPrereqRule();

    const response = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken(userIds.blocked))
      .expect(409);

    expect(response.body.code).toBe('unlock_blocked');
    expect(response.body.message).toBe('Module unlock prerequisites are not met');
    expect(response.body.reasons).toContain(`Complete prerequisite section: ${prerequisiteSectionId}`);

    const creditEvents = await prisma.creditEvent.findMany({
      where: { userId: userIds.blocked }
    });
    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.blocked,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(creditEvents).toHaveLength(0);
    expect(unlockRows).toHaveLength(0);
  });

  it('redeem returns insufficient_credits and spends nothing when balance is too low', async () => {
    await prisma.userCredit.upsert({
      where: { userId: userIds.insufficient },
      update: { balance: 30 },
      create: {
        userId: userIds.insufficient,
        balance: 30
      }
    });

    const response = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken(userIds.insufficient))
      .expect(409);

    expect(response.body).toEqual({
      code: 'insufficient_credits',
      message: 'Insufficient credits',
      required: 100,
      balance: 30
    });

    const creditEvents = await prisma.creditEvent.findMany({
      where: { userId: userIds.insufficient }
    });
    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.insufficient,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(creditEvents).toHaveLength(0);
    expect(unlockRows).toHaveLength(0);
  });

  it('redeem succeeds, spends once, and replay remains idempotent', async () => {
    await prisma.userCredit.upsert({
      where: { userId: userIds.enough },
      update: { balance: 150 },
      create: {
        userId: userIds.enough,
        balance: 150
      }
    });

    const first = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken(userIds.enough))
      .expect(200);

    expect(first.body).toEqual({
      moduleId,
      isUnlocked: true,
      reasons: [],
      requiresCredits: true,
      creditsCost: 100
    });

    const second = await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken(userIds.enough))
      .expect(200);

    expect(second.body.isUnlocked).toBe(true);
    expect(second.body.reasons).toEqual([]);

    const creditEvents = await prisma.creditEvent.findMany({
      where: { userId: userIds.enough },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });
    expect(creditEvents).toHaveLength(1);
    expect(creditEvents[0].eventType).toBe('spend');
    expect(creditEvents[0].amount).toBe(-100);
    expect(creditEvents[0].idempotencyKey).toBe(`unlock_redeem:${userIds.enough}:${moduleId}`);

    const wallet = await prisma.userCredit.findUnique({
      where: { userId: userIds.enough },
      select: { balance: true }
    });
    expect(wallet?.balance).toBe(50);

    const unlockRows = await prisma.userUnlock.findMany({
      where: {
        userId: userIds.enough,
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    expect(unlockRows).toHaveLength(1);
  });

  it('returns unlocked on status and evaluate after successful redeem', async () => {
    await prisma.userCredit.upsert({
      where: { userId: userIds.enough },
      update: { balance: 120 },
      create: {
        userId: userIds.enough,
        balance: 120
      }
    });

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/redeem-credits`)
      .set('Authorization', bearerToken(userIds.enough))
      .expect(200);

    await request(app.getHttpServer())
      .get(`/v1/unlocks/modules/${moduleId}/status`)
      .set('Authorization', bearerToken(userIds.enough))
      .expect(200)
      .expect(({ body }) => {
        expect(body.isUnlocked).toBe(true);
        expect(body.reasons).toEqual([]);
      });

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${moduleId}/evaluate`)
      .set('Authorization', bearerToken(userIds.enough))
      .expect(200)
      .expect(({ body }) => {
        expect(body.isUnlocked).toBe(true);
        expect(body.reasons).toEqual([]);
      });
  });

  async function createCreditsRule(): Promise<void> {
    const rule = await prisma.unlockRule.create({
      data: {
        scopeType: 'module',
        scopeId: moduleId,
        ruleType: 'credits',
        ruleConfigJson: {},
        isActive: true,
        priority: 20
      },
      select: { id: true }
    });
    createdRuleIds.push(rule.id);
  }

  async function createPrereqRule(): Promise<void> {
    const rule = await prisma.unlockRule.create({
      data: {
        scopeType: 'module',
        scopeId: moduleId,
        ruleType: 'prereq_sections',
        ruleConfigJson: {
          section_ids: [prerequisiteSectionId]
        },
        isActive: true,
        priority: 30
      },
      select: { id: true }
    });
    createdRuleIds.push(rule.id);
  }
});
