import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, UserRole } from '@prisma/client';
import { AppModule } from '../src/app.module';

describe('Auth schema foundation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('seeds learner and admin accounts with password hashes', async () => {
    const student = await prisma.user.findUnique({
      where: { email: 'student@academy.local' },
      select: { email: true, role: true, passwordHash: true }
    });

    const admin = await prisma.user.findUnique({
      where: { email: 'admin@academy.local' },
      select: { email: true, role: true, passwordHash: true }
    });

    expect(student).toBeTruthy();
    expect(admin).toBeTruthy();

    expect(student!.role).toBe(UserRole.user);
    expect(admin!.role).toBe(UserRole.admin);

    expect(typeof student!.passwordHash).toBe('string');
    expect(student!.passwordHash!.trim().length).toBeGreaterThan(0);
    expect(typeof admin!.passwordHash).toBe('string');
    expect(admin!.passwordHash!.trim().length).toBeGreaterThan(0);
  });

  it('supports deterministic role lookup for admin and learner users', async () => {
    const adminUsers = await prisma.user.findMany({
      where: { role: UserRole.admin },
      select: { email: true }
    });

    const learnerUsers = await prisma.user.findMany({
      where: { role: UserRole.user },
      select: { email: true }
    });

    expect(adminUsers).toHaveLength(1);
    expect(adminUsers[0].email).toBe('admin@academy.local');
    expect(learnerUsers.some((user) => user.email === 'student@academy.local')).toBe(true);
  });

  it('keeps refresh token table queryable and empty after seed', async () => {
    const seededUsers = await prisma.user.findMany({
      where: { email: { in: ['student@academy.local', 'admin@academy.local'] } },
      select: { id: true }
    });

    const refreshTokenCountForSeededUsers = await prisma.authRefreshToken.count({
      where: { userId: { in: seededUsers.map((user) => user.id) } }
    });

    expect(refreshTokenCountForSeededUsers).toBe(0);
  });
});
