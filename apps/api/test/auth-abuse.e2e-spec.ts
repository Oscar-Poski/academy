import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthRateLimitService } from '../src/modules/auth/auth-rate-limit.service';

describe('Auth abuse protections (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let limiter: AuthRateLimitService;
  let fixtureUserId: string;

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fixtureEmail = `auth-abuse-${unique}@academy.local`;
  const fixturePassword = 'password123';

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    limiter = app.get(AuthRateLimitService);

    const passwordHash = await hash(fixturePassword, 10);
    const created = await prisma.user.create({
      data: {
        email: fixtureEmail,
        name: 'Auth Abuse Fixture User',
        role: UserRole.user,
        passwordHash
      },
      select: { id: true }
    });
    fixtureUserId = created.id;
  });

  beforeEach(() => {
    limiter.resetForTests();
  });

  afterAll(async () => {
    await prisma.authRefreshToken.deleteMany({ where: { userId: fixtureUserId } });
    await prisma.user.deleteMany({ where: { id: fixtureUserId } });

    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/auth/register rejects weak password', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: `weak-password-${unique}@academy.local`,
      password: 'short7',
      name: 'Weak Password User'
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 'weak_password',
      message: 'Password must be at least 8 characters long'
    });
  });

  it('POST /v1/auth/login rate limits after 10 requests from same IP', async () => {
    for (let i = 0; i < 10; i += 1) {
      const response = await request(app.getHttpServer()).post('/v1/auth/login').send({
        email: fixtureEmail,
        password: 'wrong-password'
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      });
    }

    const blocked = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: 'wrong-password'
    });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('rate_limited');
    expect(blocked.body.message).toBe('Too many auth attempts. Try again later.');
    expect(typeof blocked.body.retry_after_seconds).toBe('number');
    expect(blocked.body.retry_after_seconds).toBeGreaterThan(0);
  });

  it('POST /v1/auth/register rate limits after 5 requests from same IP', async () => {
    for (let i = 0; i < 5; i += 1) {
      const response = await request(app.getHttpServer()).post('/v1/auth/register').send({
        email: `rate-register-${unique}-${i}@academy.local`,
        password: 'short7',
        name: `Weak Password User ${i}`
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        code: 'weak_password',
        message: 'Password must be at least 8 characters long'
      });
    }

    const blocked = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: `rate-register-${unique}-blocked@academy.local`,
      password: 'short7',
      name: 'Weak Password User blocked'
    });

    expect(blocked.status).toBe(429);
    expect(blocked.body.code).toBe('rate_limited');
    expect(blocked.body.message).toBe('Too many auth attempts. Try again later.');
    expect(typeof blocked.body.retry_after_seconds).toBe('number');
    expect(blocked.body.retry_after_seconds).toBeGreaterThan(0);
  });
});
