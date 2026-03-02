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
  const registerEmailPrefix = `auth-register-${unique}`;
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
    const registerUsers = await prisma.user.findMany({
      where: {
        email: {
          startsWith: registerEmailPrefix
        }
      },
      select: { id: true }
    });

    const userIdsToDelete = [
      ...registerUsers.map((user) => user.id),
      ...(fixtureUserId ? [fixtureUserId] : [])
    ];

    if (userIdsToDelete.length > 0) {
      await prisma.authRefreshToken.deleteMany({ where: { userId: { in: userIdsToDelete } } });
      await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
    }

    await app.close();
    await prisma.$disconnect();
  });

  it('POST /v1/auth/login returns access+refresh token metadata for valid credentials', async () => {
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
    expect(typeof response.body.refresh_token).toBe('string');
    expect(response.body.refresh_token.length).toBeGreaterThan(0);
    expect(typeof response.body.refresh_expires_in).toBe('number');
    expect(response.body.refresh_expires_in).toBeGreaterThan(0);
  });

  it('POST /v1/auth/register creates user and returns token pair; token works with GET /v1/auth/me', async () => {
    const registerEmail = `${registerEmailPrefix}-success@academy.local`;
    const registerPassword = 'password123';

    const registered = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: `  ${registerEmail.toUpperCase()}  `,
      password: `  ${registerPassword}  `,
      name: '  Register Success User  '
    });

    expect(registered.status).toBe(201);
    expect(typeof registered.body.access_token).toBe('string');
    expect(registered.body.access_token.length).toBeGreaterThan(0);
    expect(registered.body.token_type).toBe('Bearer');
    expect(typeof registered.body.expires_in).toBe('number');
    expect(registered.body.expires_in).toBeGreaterThan(0);
    expect(typeof registered.body.refresh_token).toBe('string');
    expect(registered.body.refresh_token.length).toBeGreaterThan(0);
    expect(typeof registered.body.refresh_expires_in).toBe('number');
    expect(registered.body.refresh_expires_in).toBeGreaterThan(0);

    const me = await request(app.getHttpServer())
      .get('/v1/auth/me')
      .set('Authorization', `Bearer ${registered.body.access_token}`);

    expect(me.status).toBe(200);
    expect(me.body.email).toBe(registerEmail);
    expect(me.body.name).toBe('Register Success User');
    expect(me.body.role).toBe('user');
  });

  it('POST /v1/auth/register rejects duplicate email', async () => {
    const registerEmail = `${registerEmailPrefix}-duplicate@academy.local`;

    const first = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: registerEmail,
      password: 'password123',
      name: 'Duplicate User'
    });
    expect(first.status).toBe(201);

    const second = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: registerEmail,
      password: 'password123',
      name: 'Duplicate User'
    });

    expect(second.status).toBe(409);
    expect(second.body).toEqual({
      code: 'email_in_use',
      message: 'Email already registered'
    });
  });

  it('POST /v1/auth/register rejects missing or blank required fields', async () => {
    const invalid = await request(app.getHttpServer()).post('/v1/auth/register').send({
      email: '   ',
      password: 'password123'
    });

    expect(invalid.status).toBe(400);
    expect(invalid.body).toEqual({
      code: 'invalid_registration_input',
      message: 'Email, password, and name are required'
    });
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

  it('POST /v1/auth/refresh rotates refresh token and rejects replay', async () => {
    const login = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: fixturePassword
    });

    const refreshOne = await request(app.getHttpServer()).post('/v1/auth/refresh').send({
      refresh_token: login.body.refresh_token
    });

    expect(refreshOne.status).toBe(200);
    expect(typeof refreshOne.body.access_token).toBe('string');
    expect(typeof refreshOne.body.refresh_token).toBe('string');
    expect(refreshOne.body.refresh_token).not.toBe(login.body.refresh_token);

    const replay = await request(app.getHttpServer()).post('/v1/auth/refresh').send({
      refresh_token: login.body.refresh_token
    });

    expect(replay.status).toBe(401);
    expect(replay.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid refresh token'
    });
  });

  it('POST /v1/auth/logout invalidates refresh token for next refresh', async () => {
    const login = await request(app.getHttpServer()).post('/v1/auth/login').send({
      email: fixtureEmail,
      password: fixturePassword
    });

    const logout = await request(app.getHttpServer()).post('/v1/auth/logout').send({
      refresh_token: login.body.refresh_token
    });

    expect(logout.status).toBe(200);
    expect(logout.body).toEqual({ success: true });

    const refreshAfterLogout = await request(app.getHttpServer()).post('/v1/auth/refresh').send({
      refresh_token: login.body.refresh_token
    });

    expect(refreshAfterLogout.status).toBe(401);
    expect(refreshAfterLogout.body).toEqual({
      code: 'unauthorized',
      message: 'Invalid refresh token'
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
