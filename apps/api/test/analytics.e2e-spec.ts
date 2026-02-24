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
    const path = await prisma.path.findUnique({ where: { slug: 'web-pentest-path' } });
    const module = await prisma.module.findUnique({ where: { slug: 'http-basics-module' } });
    const section = await prisma.section.findUnique({ where: { slug: 'request-response-cycle' } });

    expect(path).toBeTruthy();
    expect(module).toBeTruthy();
    expect(section).toBeTruthy();

    const sectionVersion = await prisma.sectionVersion.findFirst({
      where: {
        sectionId: section!.id,
        status: SectionVersionStatus.published
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }]
    });

    expect(sectionVersion).toBeTruthy();

    const occurredAt = '2026-02-22T18:00:00.000Z';
    const response = await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'section_complete',
        occurred_at: occurredAt,
        path_id: path!.id,
        module_id: module!.id,
        section_id: section!.id,
        section_version_id: sectionVersion!.id,
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
    expect(persisted!.pathId).toBe(path!.id);
    expect(persisted!.moduleId).toBe(module!.id);
    expect(persisted!.sectionId).toBe(section!.id);
    expect(persisted!.sectionVersionId).toBe(sectionVersion!.id);
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
    await request(app.getHttpServer())
      .post('/v1/analytics/events')
      .send({
        event_name: 'section_start',
        occurred_at: '2026-02-22T18:00:00.000Z',
        payload_json: ['not', 'an', 'object']
      })
      .expect(400);
  });

  it('POST /v1/analytics/events deduplicates by idempotency_key', async () => {
    const key = `analytics-dedupe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    createdIdempotencyKeys.push(key);

    const body = {
      event_name: 'section_start',
      occurred_at: '2026-02-22T18:00:00.000Z',
      idempotency_key: key,
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
});
