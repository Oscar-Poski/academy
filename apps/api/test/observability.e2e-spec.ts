import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ObservabilityService } from '../src/modules/observability/observability.service';

describe('Observability API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let observability: ObservabilityService;
  let learnerToken = '';
  let adminToken = '';
  let learnerUserId = '';
  let adminUserId = '';
  const createdModuleIds: string[] = [];
  const createdSectionIds: string[] = [];

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const learnerEmail = `observability-learner-${unique}@academy.local`;
  const adminEmail = `observability-admin-${unique}@academy.local`;
  const learnerPassword = 'password123';
  const adminPassword = 'admin123';

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    observability = app.get(ObservabilityService);

    const learnerHash = await hash(learnerPassword, 10);
    const adminHash = await hash(adminPassword, 10);

    const learner = await prisma.user.create({
      data: {
        email: learnerEmail,
        name: 'Observability Learner',
        role: UserRole.user,
        passwordHash: learnerHash
      },
      select: { id: true }
    });
    learnerUserId = learner.id;

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Observability Admin',
        role: UserRole.admin,
        passwordHash: adminHash
      },
      select: { id: true }
    });
    adminUserId = admin.id;

    learnerToken = await login(learnerEmail, learnerPassword);
    adminToken = await login(adminEmail, adminPassword);
  });

  beforeEach(() => {
    observability.resetForTests();
  });

  afterAll(async () => {
    if (createdModuleIds.length > 0) {
      await prisma.unlockRule.deleteMany({
        where: {
          scopeId: { in: createdModuleIds }
        }
      });
      await prisma.userUnlock.deleteMany({
        where: {
          scopeId: { in: createdModuleIds }
        }
      });
      await prisma.module.deleteMany({
        where: { id: { in: createdModuleIds } }
      });
    }

    if (createdSectionIds.length > 0) {
      await prisma.section.deleteMany({
        where: { id: { in: createdSectionIds } }
      });
    }

    if (learnerUserId) {
      await prisma.authRefreshToken.deleteMany({ where: { userId: learnerUserId } });
      await prisma.user.deleteMany({ where: { id: learnerUserId } });
    }
    if (adminUserId) {
      await prisma.authRefreshToken.deleteMany({ where: { userId: adminUserId } });
      await prisma.user.deleteMany({ where: { id: adminUserId } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('adds x-request-id header on responses', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(typeof response.headers['x-request-id']).toBe('string');
    expect(response.headers['x-request-id'].length).toBeGreaterThan(0);
  });

  it('exposes /metrics snapshot', async () => {
    const response = await request(app.getHttpServer()).get('/metrics').expect(200);
    expect(typeof response.body.uptime_seconds).toBe('number');
    expect(typeof response.body.generated_at).toBe('string');
    expect(response.body.counters).toMatchObject({
      auth_failures_total: expect.any(Number),
      completion_blocked_total: expect.any(Number),
      requests_total: expect.any(Number)
    });
  });

  it('increments auth invalid credentials metrics', async () => {
    const before = await readMetrics();

    await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: learnerEmail,
      password: 'wrong-password'
    }).expect(401);

    const after = await readMetrics();
    expect(after.auth_invalid_credentials_total).toBe(before.auth_invalid_credentials_total + 1);
    expect(after.auth_failures_total).toBe(before.auth_failures_total + 1);
  });

  it('increments invalid bearer metrics', async () => {
    const before = await readMetrics();

    await request(app.getHttpServer()).get('/v1/auth/me').expect(401);

    const after = await readMetrics();
    expect(after.auth_invalid_bearer_total).toBe(before.auth_invalid_bearer_total + 1);
    expect(after.auth_failures_total).toBe(before.auth_failures_total + 1);
  });

  it('increments completion blocked metric', async () => {
    const before = await readMetrics();

    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: { id: true }
    });
    expect(section).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${section!.id}/complete`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(409);

    const after = await readMetrics();
    expect(after.completion_blocked_total).toBe(before.completion_blocked_total + 1);
  });

  it('increments unlock blocked and insufficient credits metrics', async () => {
    const before = await readMetrics();
    const seededPath = await prisma.path.findUnique({
      where: { slug: 'web-pentest-path' },
      select: { id: true }
    });
    expect(seededPath).toBeTruthy();

    const prereqSection = await prisma.section.create({
      data: {
        moduleId: (
          await prisma.module.findUnique({
            where: { slug: 'http-basics-module' },
            select: { id: true }
          })
        )!.id,
        slug: `observability-prereq-${unique}`,
        title: 'Observability prereq section',
        sortOrder: 9999,
        hasQuiz: false
      },
      select: { id: true }
    });
    createdSectionIds.push(prereqSection.id);

    const blockedModule = await prisma.module.create({
      data: {
        pathId: seededPath!.id,
        slug: `observability-blocked-module-${unique}`,
        title: 'Observability blocked module',
        sortOrder: 9911,
        creditsCost: 10
      },
      select: { id: true }
    });
    createdModuleIds.push(blockedModule.id);
    await prisma.unlockRule.createMany({
      data: [
        {
          scopeType: 'module',
          scopeId: blockedModule.id,
          ruleType: 'prereq_sections',
          ruleConfigJson: { section_ids: [prereqSection.id] },
          isActive: true,
          priority: 1
        },
        {
          scopeType: 'module',
          scopeId: blockedModule.id,
          ruleType: 'credits',
          ruleConfigJson: {},
          isActive: true,
          priority: 2
        }
      ]
    });

    const insufficientModule = await prisma.module.create({
      data: {
        pathId: seededPath!.id,
        slug: `observability-insufficient-module-${unique}`,
        title: 'Observability insufficient module',
        sortOrder: 9912,
        creditsCost: 25
      },
      select: { id: true }
    });
    createdModuleIds.push(insufficientModule.id);
    await prisma.unlockRule.create({
      data: {
        scopeType: 'module',
        scopeId: insufficientModule.id,
        ruleType: 'credits',
        ruleConfigJson: {},
        isActive: true,
        priority: 1
      }
    });

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${blockedModule.id}/redeem-credits`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(409);

    await request(app.getHttpServer())
      .post(`/v1/unlocks/modules/${insufficientModule.id}/redeem-credits`)
      .set('Authorization', `Bearer ${learnerToken}`)
      .expect(409);

    const after = await readMetrics();
    expect(after.unlock_blocked_total).toBe(before.unlock_blocked_total + 1);
    expect(after.unlock_insufficient_credits_total).toBe(before.unlock_insufficient_credits_total + 1);
  });

  it('increments admin publish conflict metric', async () => {
    const before = await readMetrics();

    const seededModule = await prisma.module.findUnique({
      where: { slug: 'http-basics-module' },
      select: { id: true }
    });
    expect(seededModule).toBeTruthy();

    const section = await prisma.section.create({
      data: {
        moduleId: seededModule!.id,
        slug: `observability-admin-section-${unique}`,
        title: 'Observability admin section',
        sortOrder: 9940,
        hasQuiz: false
      },
      select: { id: true }
    });
    createdSectionIds.push(section.id);

    const publishedVersion = await prisma.sectionVersion.create({
      data: {
        sectionId: section.id,
        versionNumber: 1,
        status: 'published',
        publishedAt: new Date(),
        changeLog: 'published baseline'
      },
      select: { id: true }
    });

    await request(app.getHttpServer())
      .post(`/v1/admin/sections/${section.id}/publish/${publishedVersion.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    const after = await readMetrics();
    expect(after.admin_publish_conflict_total).toBe(before.admin_publish_conflict_total + 1);
  });

  async function login(email: string, password: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/v1/auth/login').send({ email, password });
    if (response.status !== 200 || typeof response.body.access_token !== 'string') {
      throw new Error(`login failed for ${email}`);
    }

    return response.body.access_token;
  }

  async function readMetrics(): Promise<Record<string, number>> {
    const response = await request(app.getHttpServer()).get('/metrics').expect(200);
    return response.body.counters as Record<string, number>;
  }
});
