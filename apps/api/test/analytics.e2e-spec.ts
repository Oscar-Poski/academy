import { INestApplication } from '@nestjs/common';
import { PrismaClient, SectionVersionStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Analytics API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const createdEventIds: string[] = [];
  const createdIdempotencyKeys: string[] = [];

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    if (createdEventIds.length === 0) {
      if (createdIdempotencyKeys.length === 0) {
        return;
      }
    }

    if (createdIdempotencyKeys.length > 0) {
      await prisma.analyticsEvent.deleteMany({
        where: {
          idempotencyKey: {
            in: [...createdIdempotencyKeys]
          }
        }
      });
    }

    if (createdEventIds.length > 0) {
      await prisma.analyticsEvent.deleteMany({
        where: {
          id: {
            in: [...createdEventIds]
          }
        }
      });
    }
    createdEventIds.length = 0;
    createdIdempotencyKeys.length = 0;
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/analytics/events persists a raw event', async () => {
    const ctx = await resolveAnalyticsContext();

    const occurredAt = '2026-02-22T18:00:00.000Z';
    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'section_complete',
        occurred_at: occurredAt,
        user_id: ctx.userId,
        path_id: ctx.pathId,
        module_id: ctx.moduleId,
        section_id: ctx.sectionId,
        section_version_id: ctx.sectionVersionId,
        payload_json: { source: 'analytics-e2e', score: 100 }
      })
      .expect(201);

    expect(response.body.id).toEqual(expect.any(String));
    createdEventIds.push(response.body.id);

    const persisted = await prisma.analyticsEvent.findUnique({
      where: { id: response.body.id }
    });

    expect(persisted).toBeTruthy();
    expect(persisted!.eventName).toBe('section_complete');
    expect(persisted!.userId).toBe(ctx.userId);
    expect(persisted!.pathId).toBe(ctx.pathId);
    expect(persisted!.moduleId).toBe(ctx.moduleId);
    expect(persisted!.sectionId).toBe(ctx.sectionId);
    expect(persisted!.sectionVersionId).toBe(ctx.sectionVersionId);
    expect(persisted!.payloadJson).toEqual({ source: 'analytics-e2e', score: 100 });
    expect(persisted!.occurredAt.toISOString()).toBe(occurredAt);
    expect(persisted!.receivedAt).toBeInstanceOf(Date);
  });

  it('POST /v1/analytics/events rejects invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: '   ',
        occurred_at: 'not-a-date'
      })
      .expect(400);
  });

  it('POST /v1/analytics/events rejects unsupported event_name', async () => {
    await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'random_event',
        occurred_at: '2026-02-22T18:00:00.000Z'
      })
      .expect(400);
  });

  it('POST /v1/analytics/events rejects invalid payload_json type', async () => {
    const ctx = await resolveAnalyticsContext();

    await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'section_start',
        occurred_at: '2026-02-22T18:00:00.000Z',
        user_id: ctx.userId,
        path_id: ctx.pathId,
        module_id: ctx.moduleId,
        section_id: ctx.sectionId,
        section_version_id: ctx.sectionVersionId,
        payload_json: ['not', 'an', 'object']
      })
      .expect(400);
  });

  it('POST /v1/analytics/events rejects section_start without required ids', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'section_start',
        occurred_at: '2026-02-22T18:00:00.000Z',
        payload_json: { source: 'analytics-e2e' }
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'invalid_analytics_payload',
      message: 'Analytics payload failed validation'
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        'user_id is required',
        'path_id is required',
        'module_id is required',
        'section_id is required',
        'section_version_id is required'
      ])
    );
  });

  it('POST /v1/analytics/events rejects player_exit without required lifecycle payload fields', async () => {
    const ctx = await resolveAnalyticsContext();

    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'player_exit',
        occurred_at: '2026-02-22T18:00:00.000Z',
        user_id: ctx.userId,
        path_id: ctx.pathId,
        module_id: ctx.moduleId,
        section_id: ctx.sectionId,
        section_version_id: ctx.sectionVersionId,
        payload_json: {}
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'invalid_analytics_payload',
      message: 'Analytics payload failed validation'
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        'payload_json.source is required',
        'payload_json.dwell_ms must be a number >= 0',
        'payload_json.completed must be a boolean'
      ])
    );
  });

  it('POST /v1/analytics/events rejects player_dropoff with invalid dwell_ms', async () => {
    const ctx = await resolveAnalyticsContext();

    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'player_dropoff',
        occurred_at: '2026-02-22T18:00:00.000Z',
        user_id: ctx.userId,
        path_id: ctx.pathId,
        module_id: ctx.moduleId,
        section_id: ctx.sectionId,
        section_version_id: ctx.sectionVersionId,
        payload_json: {
          source: 'learn_player',
          dwell_ms: -1,
          completed: false
        }
      })
      .expect(400);

    expect(response.body).toMatchObject({
      code: 'invalid_analytics_payload',
      message: 'Analytics payload failed validation'
    });
    expect(response.body.details).toEqual(
      expect.arrayContaining(['payload_json.dwell_ms must be a number >= 0'])
    );
  });

  it('POST /v1/analytics/events deduplicates by idempotency_key', async () => {
    const ctx = await resolveAnalyticsContext();
    const key = `analytics-dedupe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdIdempotencyKeys.push(key);

    const body = {
      event_name: 'section_start',
      occurred_at: '2026-02-22T18:00:00.000Z',
      idempotency_key: key,
      user_id: ctx.userId,
      path_id: ctx.pathId,
      module_id: ctx.moduleId,
      section_id: ctx.sectionId,
      section_version_id: ctx.sectionVersionId,
      payload_json: { source: 'dedupe-test' }
    };

    const first = await request(app.getHttpServer()).post('/v1/analytics/events').send(body).expect(201);
    const second = await request(app.getHttpServer()).post('/v1/analytics/events').send(body).expect(201);

    expect(first.body.id).toEqual(expect.any(String));
    expect(second.body.id).toBe(first.body.id);

    const rows = await prisma.analyticsEvent.findMany({
      where: { idempotencyKey: key },
      select: { id: true }
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(first.body.id);
  });

  async function resolveAnalyticsContext(): Promise<{
    userId: string;
    pathId: string;
    moduleId: string;
    sectionId: string;
    sectionVersionId: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { email: 'student@academy.local' },
      select: { id: true }
    });
    const path = await prisma.path.findUnique({ where: { slug: 'web-pentest-path' }, select: { id: true } });
    const module = await prisma.module.findUnique({ where: { slug: 'http-basics-module' }, select: { id: true } });
    const section = await prisma.section.findUnique({ where: { slug: 'request-response-cycle' }, select: { id: true } });

    expect(user).toBeTruthy();
    expect(path).toBeTruthy();
    expect(module).toBeTruthy();
    expect(section).toBeTruthy();

    const sectionVersion = await prisma.sectionVersion.findFirst({
      where: {
        sectionId: section!.id,
        status: SectionVersionStatus.published
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: { id: true }
    });
    expect(sectionVersion).toBeTruthy();

    return {
      userId: user!.id,
      pathId: path!.id,
      moduleId: module!.id,
      sectionId: section!.id,
      sectionVersionId: sectionVersion!.id
    };
  }
});
