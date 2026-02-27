import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { CreditEventType, PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { bearerToken } from './bearer-token';

describe('Credits API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  const userIds = {
    wallet: 'credits-wallet-user',
    fixture: 'credits-fixture-user'
  } as const;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    await Promise.all(
      Object.values(userIds).map((id, index) =>
        prisma.user.upsert({
          where: { email: `credits-test-${index}@academy.local` },
          update: { id, name: `Credits Test ${index}` },
          create: {
            id,
            email: `credits-test-${index}@academy.local`,
            name: `Credits Test ${index}`
          }
        })
      )
    );
  });

  beforeEach(async () => {
    await prisma.creditEvent.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userCredit.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
  });

  afterAll(async () => {
    await prisma.creditEvent.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });
    await prisma.userCredit.deleteMany({
      where: { userId: { in: Object.values(userIds) } }
    });

    await app.close();
    await prisma.$disconnect();
  });

  it('returns wallet with zero balance when no user_credits row exists', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', bearerToken(userIds.wallet))
      .expect(200);

    expect(response.body).toEqual({
      userId: userIds.wallet,
      balance: 0,
      updatedAt: null
    });
  });

  it('returns exact net balance after deterministic fixture events', async () => {
    await prisma.creditEvent.createMany({
      data: [
        {
          userId: userIds.fixture,
          eventType: CreditEventType.grant,
          amount: 50,
          idempotencyKey: `grant:${userIds.fixture}:1`,
          reason: 'seed_fixture'
        },
        {
          userId: userIds.fixture,
          eventType: CreditEventType.spend,
          amount: -20,
          idempotencyKey: `spend:${userIds.fixture}:1`,
          reason: 'seed_fixture'
        }
      ]
    });

    await prisma.userCredit.upsert({
      where: { userId: userIds.fixture },
      update: { balance: 30 },
      create: {
        userId: userIds.fixture,
        balance: 30
      }
    });

    const response = await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', bearerToken(userIds.fixture))
      .expect(200);

    expect(response.body.userId).toBe(userIds.fixture);
    expect(response.body.balance).toBe(30);
    expect(typeof response.body.updatedAt).toBe('string');
  });

  it('rejects missing and malformed bearer tokens', async () => {
    await request(app.getHttpServer()).get('/v1/credits/me').expect(401);

    await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', 'Bearer')
      .expect(401);
  });

  it('rejects unknown bearer subject with 400', async () => {
    await request(app.getHttpServer())
      .get('/v1/credits/me')
      .set('Authorization', bearerToken('unknown-credits-user'))
      .expect(400);
  });
});
