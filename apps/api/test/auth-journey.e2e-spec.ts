import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth Journey (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let seededSectionId: string;
  let seededModuleId: string;
  let seededPathId: string;

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `auth-journey-${unique}@academy.local`;
  const password = 'password123';
  let createdUserId: string | null = null;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const section = await prisma.section.findUnique({
      where: { slug: 'request-response-cycle' },
      select: {
        id: true,
        moduleId: true,
        module: {
          select: {
            pathId: true
          }
        }
      }
    });

    if (!section) {
      throw new Error('Seeded section request-response-cycle not found. Run migrate + seed first.');
    }

    seededSectionId = section.id;
    seededModuleId = section.moduleId;
    seededPathId = section.module.pathId;
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.authRefreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.userSectionProgress.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('register -> start -> logout -> login -> continue resume journey', async () => {
    const register = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email,
      password,
      name: 'Journey User'
    });

    expect(register.status).toBe(201);
    expect(typeof register.body.access_token).toBe('string');
    expect(register.body.access_token.length).toBeGreaterThan(0);
    expect(typeof register.body.refresh_token).toBe('string');
    expect(register.body.refresh_token.length).toBeGreaterThan(0);

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${register.body.access_token}`)
      .expect(200);

    createdUserId = me.body.id as string;

    await request(app.getHttpServer())
      .post(`/v1/progress/sections/${seededSectionId}/start`)
      .set('Authorization', `Bearer ${register.body.access_token}`)
      .expect(201);

    const progressRow = await prisma.userSectionProgress.findUnique({
      where: {
        userId_sectionId: {
          userId: createdUserId,
          sectionId: seededSectionId
        }
      },
      select: {
        status: true
      }
    });

    expect(progressRow?.status).toBe('in_progress');

    await request(app.getHttpServer())
      .post('/v1/auth/logout')
      .send({ refresh_token: register.body.refresh_token })
      .expect(200);

    const refreshReplay = await request(app.getHttpServer()).post('/v1/auth/refresh').send({
      refresh_token: register.body.refresh_token
    });

    expect(refreshReplay.status).toBe(401);
    expect(refreshReplay.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid refresh token'
    });

    const loginAgain = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email,
      password
    });

    expect(loginAgain.status).toBe(200);
    expect(typeof loginAgain.body.access_token).toBe('string');
    expect(loginAgain.body.access_token.length).toBeGreaterThan(0);

    const continueLearning = await request(app.getHttpServer())
      .get('/v1/progress/continue')
      .set('Authorization', `Bearer ${loginAgain.body.access_token}`)
      .expect(200);

    expect(continueLearning.body.source).toBe('resume');
    expect(continueLearning.body.sectionId).toBe(seededSectionId);
    expect(continueLearning.body.moduleId).toBe(seededModuleId);
    expect(continueLearning.body.pathId).toBe(seededPathId);
    expect(continueLearning.body.lastSeenAt).toEqual(expect.any(String));
  });
});
