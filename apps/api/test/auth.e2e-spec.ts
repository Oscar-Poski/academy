import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fixtureEmail = `auth-user-${unique}@academy.local`;
  const fixturePassword = 'password123';
  let fixtureUserId = '';

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const passwordHash = await hash(fixturePassword, 10);
    const created = await prisma.user.create({
      data: {
        email: fixtureEmail,
        name: 'Auth Fixture User',
        role: UserRole.user,
        passwordHash
      },
      select: { id: true }
    });
    fixtureUserId = created.id;
  });

  afterAll(async () => {
    if (fixtureUserId) {
      await prisma.user.deleteMany({ where: { id: fixtureUserId } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/auth/login returns token and metadata for valid credentials', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: fixturePassword
    });

    expect(response.status).toBe(200);
    expect(typeof response.body.access_token).toBe('string');
    expect(response.body.access_token.length).toBeGreaterThan(0);
    expect(response.body.token_type).toBe('Bearer');
    expect(typeof response.body.expires_in).toBe('number');
    expect(response.body.expires_in).toBeGreaterThan(0);
  });

  it('POST /v1/auth/login rejects unknown email and wrong password', async () => {
    const unknown = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: `missing-${fixtureEmail}`,
      password: fixturePassword
    });

    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    });

    const wrongPassword = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: 'wrong-password'
    });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body).toEqual({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  });

  it('GET /v1/auth/me rejects missing or malformed bearer token', async () => {
    const missing = await request(app.getHttpServer()).get('/v1/auth/me');
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });

    const malformed = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', 'Bearer');

    expect(malformed.status).toBe(401);
    expect(malformed.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });

  it('GET /v1/auth/me returns principal for valid token and rejects unknown subject token', async () => {
    const login = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: fixturePassword
    });

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`);

    expect(me.status).toBe(200);
    expect(me.body).toEqual({
      id: fixtureUserId,
      email: fixtureEmail,
      name: 'Auth Fixture User',
      role: 'user'
    });

    const forged = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${await signUnknownSubjectToken()}`);

    expect(forged.status).toBe(401);
    expect(forged.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });

  async function signUnknownSubjectToken(): Promise<string> {
    const jwtService = new JwtService();

    return jwtService.signAsync(
      {
        sub: 'non-existent-user-id',
        email: 'missing@academy.local',
        role: 'user'
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: 120
      }
    );
  }
});
