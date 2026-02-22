import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Progress API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seededPathId: string;
  let seededModuleId: string;
  let seededSectionId: string;
  let fallbackSectionId: string;

  const userIds = {
    happy: 'progress-test-happy-user',
    complete: 'progress-test-complete-user',
    pinning: 'progress-test-pinning-user',
    resume: 'progress-test-resume-user',
    fallback: 'progress-test-fallback-user'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const path = await prisma.path.findUnique({ where: { slug: 'web-pentest-path' } });
    const module = await prisma.module.findUnique({ where: { slug: 'http-basics-module' } });
    const sectionOne = await prisma.section.findUnique({ where: { slug: 'request-response-cycle' } });
    const firstPathTree = await prisma.path.findFirst({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          take: 1,
          select: {
            sections: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
              take: 1,
              select: { id: true }
            }
          }
        }
      }
    });

    if (!path || !module || !sectionOne || !firstPathTree || firstPathTree.modules.length === 0) {
      throw new Error('Seeded content not found. Run API migrate + seed before tests.');
    }

    if (firstPathTree.modules[0].sections.length === 0) {
      throw new Error('Seeded first module has no sections.');
    }

    seededPathId = path.id;
    seededModuleId = module.id;
    seededSectionId = sectionOne.id;
    fallbackSectionId = firstPathTree.modules[0].sections[0].id;

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `progress-test-${index}@academy.local` },
          update: { id, name: `Progress Test ${index}` },
          create: {
            id,
            email: `progress-test-${index}@academy.local`,
            name: `Progress Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: {
          in: Object.values(userIds)
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.userSectionProgress.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('start -> position -> complete happy path', async () => {
    const start = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('x-user-id', userIds.happy)
      .expect(201);

    expect(start.body.status).toBe('in_progress');
    expect(start.body.sectionVersionId).toEqual(expect.any(String));

    const position = await request(app.getHttpServer())
      .patch(`/v1/progress/sections/${seededSectionId}/position`)
      .set('x-user-id', userIds.happy)
      .send({
        last_block_order: 2,
        time_spent_delta: 30,
        completion_pct: 60
      })
      .expect(200);

    expect(position.body.status).toBe('in_progress');
    expect(position.body.lastBlockOrder).toBe(2);
    expect(position.body.timeSpentSeconds).toBeGreaterThanOrEqual(30);
    expect(position.body.completionPct).toBeGreaterThanOrEqual(60);

    const complete = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/complete`)
      .set('x-user-id', userIds.happy)
      .expect(201);

    expect(complete.body.status).toBe('completed');
    expect(complete.body.completionPct).toBe(100);
    expect(complete.body.completedAt).toEqual(expect.any(String));
  });

  it('complete is idempotent and preserves completedAt', async () => {
    const first = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/complete`)
      .set('x-user-id', userIds.complete)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/complete`)
      .set('x-user-id', userIds.complete)
      .expect(201);

    expect(first.body.status).toBe('completed');
    expect(second.body.status).toBe('completed');
    expect(second.body.sectionVersionId).toBe(first.body.sectionVersionId);
    expect(second.body.completedAt).toBe(first.body.completedAt);
    expect(second.body.timeSpentSeconds).toBe(first.body.timeSpentSeconds);
  });

  it('start twice returns same pinned section_version_id', async () => {
    const first = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('x-user-id', userIds.pinning)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('x-user-id', userIds.pinning)
      .expect(201);

    expect(first.body.sectionVersionId).toBe(second.body.sectionVersionId);

    const rows = await prisma.userSectionProgress.findMany({
      where: { userId: userIds.pinning, sectionId: seededSectionId }
    });
    expect(rows).toHaveLength(1);
  });

  it('get section progress returns 404 before start and row after start', async () => {
    await request(app.getHttpServer())
      .get(`/v1/progress/sections/${seededSectionId}`)
      .set('x-user-id', userIds.happy)
      .expect(404);

    const start = await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('x-user-id', userIds.happy)
      .expect(201);

    const fetched = await request(app.getHttpServer())
      .get(`/v1/progress/sections/${seededSectionId}`)
      .set('x-user-id', userIds.happy)
      .expect(200);

    expect(fetched.body.id).toEqual(expect.any(String));
    expect(fetched.body.sectionId).toBe(seededSectionId);
    expect(fetched.body.sectionVersionId).toBe(start.body.sectionVersionId);
    expect(fetched.body.status).toBe('in_progress');
    expect(fetched.body.completionPct).toBe(0);
  });

  it('continue returns resume when in_progress exists and fallback otherwise', async () => {
    const fallback = await request(app.getHttpServer())
      .get('/v1/progress/continue')
      .set('x-user-id', userIds.fallback)
      .expect(200);

    expect(fallback.body.source).toBe('fallback');
    expect(fallback.body.sectionId).toBe(fallbackSectionId);

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('x-user-id', userIds.resume)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/v1/progress/sections/${seededSectionId}/position`)
      .set('x-user-id', userIds.resume)
      .send({ last_block_order: 1, time_spent_delta: 5, completion_pct: 10 })
      .expect(200);

    const resume = await request(app.getHttpServer())
      .get('/v1/progress/continue')
      .set('x-user-id', userIds.resume)
      .expect(200);

    expect(resume.body.source).toBe('resume');
    expect(resume.body.sectionId).toBe(seededSectionId);
    expect(resume.body.moduleId).toBe(seededModuleId);
    expect(resume.body.pathId).toBe(seededPathId);
    expect(resume.body.lastSeenAt).toEqual(expect.any(String));
  });
});
