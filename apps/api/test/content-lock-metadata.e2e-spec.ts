import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Content API lock metadata (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let pathId: string;
  let moduleId: string;
  let sectionId: string;

  const userIds = {
    locked: 'content-lock-locked-user',
    unlocked: 'content-lock-unlocked-user'
  } as const;
  const bearerUser = {
    id: 'content-lock-bearer-user',
    email: 'content-lock-bearer@academy.local',
    password: 'password123'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const path = await prisma.path.findUnique({
      where: { slug: 'web-pentest-path' },
      select: { id: true }
    });
    if (!path) {
      throw new Error('Seeded path not found. Run API migrate + seed before tests.');
    }
    pathId = path.id;

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

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `content-lock-test-${index}@academy.local` },
          update: { id, name: `Content Lock Test ${index}` },
          create: {
            id,
            email: `content-lock-test-${index}@academy.local`,
            name: `Content Lock Test ${index}`
          }
        })
      )
    );

    const bearerHash = await hash(bearerUser.password, 10);
    await prisma.user.upsert({
      where: { email: bearerUser.email },
      update: {
        id: bearerUser.id,
        name: 'Content Lock Bearer User',
        role: 'user',
        passwordHash: bearerHash
      },
      create: {
        id: bearerUser.id,
        email: bearerUser.email,
        name: 'Content Lock Bearer User',
        role: 'user',
        passwordHash: bearerHash
      }
    });
  });

  beforeEach(async () => {
    await prisma.userUnlock.deleteMany({
      where: {
        userId: { in: [...Object.values(userIds), bearerUser.id] },
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: [...Object.values(userIds), bearerUser.id] }
      }
    });
    await prisma.authRefreshToken.deleteMany({
      where: {
        userId: bearerUser.id
      }
    });
  });

  afterAll(async () => {
    await prisma.userUnlock.deleteMany({
      where: {
        userId: { in: [...Object.values(userIds), bearerUser.id] },
        scopeType: 'module',
        scopeId: moduleId
      }
    });
    await prisma.userSectionProgress.deleteMany({
      where: {
        userId: { in: [...Object.values(userIds), bearerUser.id] }
      }
    });
    await prisma.authRefreshToken.deleteMany({
      where: { userId: bearerUser.id }
    });
    await prisma.user.deleteMany({
      where: { id: bearerUser.id }
    });
    await app.close();
    await prisma.$disconnect();
  });

  it('keeps anonymous responses backward-compatible without lock fields', async () => {
    const pathResponse = await request(app.getHttpServer()).get(`/v1/paths/${pathId}`).expect(200);
    const moduleInPath = pathResponse.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock).toBeUndefined();
    expect(moduleInPath.sections.some((section: { lock?: unknown }) => 'lock' in section)).toBe(false);

    const moduleResponse = await request(app.getHttpServer()).get(`/v1/modules/${moduleId}`).expect(200);
    expect(moduleResponse.body.lock).toBeUndefined();
    expect(
      moduleResponse.body.sections.some((section: { lock?: unknown }) => 'lock' in section)
    ).toBe(false);

    const sectionResponse = await request(app.getHttpServer())
      .get(`/v1/sections/${sectionId}`)
      .expect(200);
    expect(sectionResponse.body.navigation.prevSectionLock).toBeUndefined();
    expect(sectionResponse.body.navigation.nextSectionLock).toBeUndefined();
  });

  it('treats unknown x-user-id as anonymous and does not fail', async () => {
    const pathResponse = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('x-user-id', 'unknown-content-lock-user')
      .expect(200);
    const moduleInPath = pathResponse.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock).toBeUndefined();
  });

  it('returns locked metadata for known user without prerequisites complete', async () => {
    const pathResponse = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('x-user-id', userIds.locked)
      .expect(200);

    const moduleInPath = pathResponse.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock).toBeTruthy();
    expect(moduleInPath.lock.isLocked).toBe(true);
    expect(moduleInPath.lock.reasons).toContain(`Complete prerequisite section: ${sectionId}`);
    expect(
      moduleInPath.sections.every(
        (section: { lock: { isLocked: boolean } }) => section.lock && section.lock.isLocked === true
      )
    ).toBe(true);

    const moduleResponse = await request(app.getHttpServer())
      .get(`/v1/modules/${moduleId}`)
      .set('x-user-id', userIds.locked)
      .expect(200);
    expect(moduleResponse.body.lock).toBeTruthy();
    expect(moduleResponse.body.lock.isLocked).toBe(true);
    expect(
      moduleResponse.body.sections.every(
        (section: { lock: { isLocked: boolean } }) => section.lock && section.lock.isLocked === true
      )
    ).toBe(true);

    const sectionResponse = await request(app.getHttpServer())
      .get(`/v1/sections/${sectionId}`)
      .set('x-user-id', userIds.locked)
      .expect(200);
    if (sectionResponse.body.navigation.nextSectionId) {
      expect(sectionResponse.body.navigation.nextSectionLock).toBeTruthy();
      expect(sectionResponse.body.navigation.nextSectionLock.isLocked).toBe(true);
    }
    if (sectionResponse.body.navigation.prevSectionId) {
      expect(sectionResponse.body.navigation.prevSectionLock).toBeTruthy();
      expect(sectionResponse.body.navigation.prevSectionLock.isLocked).toBe(true);
    }
  });

  it('returns unlocked metadata for known user when a module unlock grant exists', async () => {
    await prisma.userUnlock.create({
      data: {
        userId: userIds.unlocked,
        scopeType: 'module',
        scopeId: moduleId,
        reason: 'test_grant'
      }
    });

    const pathResponse = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('x-user-id', userIds.unlocked)
      .expect(200);

    const moduleInPath = pathResponse.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock).toBeTruthy();
    expect(moduleInPath.lock.isLocked).toBe(false);
    expect(moduleInPath.lock.reasons).toEqual([]);

    const moduleSortOrders = pathResponse.body.modules.map((item: { sortOrder: number }) => item.sortOrder);
    expect(moduleSortOrders).toEqual([...moduleSortOrders].sort((a: number, b: number) => a - b));

    const moduleResponse = await request(app.getHttpServer())
      .get(`/v1/modules/${moduleId}`)
      .set('x-user-id', userIds.unlocked)
      .expect(200);
    const sectionSortOrders = moduleResponse.body.sections.map((item: { sortOrder: number }) => item.sortOrder);
    expect(sectionSortOrders).toEqual([...sectionSortOrders].sort((a: number, b: number) => a - b));
    expect(moduleResponse.body.lock.isLocked).toBe(false);
    expect(moduleResponse.body.lock.reasons).toEqual([]);

    const sectionResponse = await request(app.getHttpServer())
      .get(`/v1/sections/${sectionId}`)
      .set('x-user-id', userIds.unlocked)
      .expect(200);
    const blockOrders = sectionResponse.body.lessonBlocks.map((item: { blockOrder: number }) => item.blockOrder);
    expect(blockOrders).toEqual([...blockOrders].sort((a: number, b: number) => a - b));
    if (sectionResponse.body.navigation.nextSectionId) {
      expect(sectionResponse.body.navigation.nextSectionLock).toBeTruthy();
      expect(sectionResponse.body.navigation.nextSectionLock.isLocked).toBe(false);
      expect(sectionResponse.body.navigation.nextSectionLock.reasons).toEqual([]);
    }
  });

  it('accepts optional bearer auth context for content lock metadata', async () => {
    await prisma.userUnlock.create({
      data: {
        userId: bearerUser.id,
        scopeType: 'module',
        scopeId: moduleId,
        reason: 'test_bearer_grant'
      }
    });

    const token = await loginAndGetAccessToken();

    const pathResponse = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const moduleInPath = pathResponse.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock.isLocked).toBe(false);
  });

  it('treats invalid bearer token without header as anonymous on content routes', async () => {
    const response = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('Authorization', 'Bearer invalid-token')
      .expect(200);

    const moduleInPath = response.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock).toBeUndefined();
  });

  it('prefers bearer principal over conflicting x-user-id on content routes', async () => {
    await prisma.userUnlock.create({
      data: {
        userId: bearerUser.id,
        scopeType: 'module',
        scopeId: moduleId,
        reason: 'test_bearer_priority'
      }
    });

    const token = await loginAndGetAccessToken();

    const response = await request(app.getHttpServer())
      .get(`/v1/paths/${pathId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-user-id', userIds.locked)
      .expect(200);

    const moduleInPath = response.body.modules.find((item: { id: string }) => item.id === moduleId);
    expect(moduleInPath).toBeTruthy();
    expect(moduleInPath.lock.isLocked).toBe(false);
  });

  async function loginAndGetAccessToken(): Promise<string> {
    const login = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: bearerUser.email,
      password: bearerUser.password
    });

    expect(login.status).toBe(200);
    expect(typeof login.body.access_token).toBe('string');
    return login.body.access_token;
  }
});
