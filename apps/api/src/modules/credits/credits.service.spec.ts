import { CreditEventType } from '@prisma/client';
import { CreditsService } from './credits.service';

describe('CreditsService', () => {
  it('returns zero balance with null updatedAt when wallet row is missing', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue(null)
      }
    };

    const service = new CreditsService(prisma as never);

    await expect(service.getWallet('u1')).resolves.toEqual({
      userId: 'u1',
      balance: 0,
      updatedAt: null
    });
  });

  it('returns persisted wallet balance when row exists', async () => {
    const updatedAt = new Date('2026-02-27T12:00:00.000Z');
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({
          balance: 75,
          updatedAt
        })
      }
    };

    const service = new CreditsService(prisma as never);

    await expect(service.getWallet('u1')).resolves.toEqual({
      userId: 'u1',
      balance: 75,
      updatedAt: updatedAt.toISOString()
    });
  });

  it('applyCreditEvent writes ledger row and updates balance snapshot', async () => {
    const tx = {
      creditEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'ce-1' })
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({ balance: 10 }),
        upsert: jest.fn().mockResolvedValue({ userId: 'u1', balance: 35 })
      }
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx))
    };

    const service = new CreditsService(prisma as never);

    await service.applyCreditEvent({
      userId: 'u1',
      eventType: CreditEventType.grant,
      amount: 25,
      idempotencyKey: 'grant:u1:1',
      reason: 'test_grant'
    });

    expect(tx.creditEvent.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        eventType: CreditEventType.grant,
        amount: 25,
        idempotencyKey: 'grant:u1:1',
        reason: 'test_grant'
      }
    });
    expect(tx.userCredit.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { balance: 35 },
      create: {
        userId: 'u1',
        balance: 35
      }
    });
  });

  it('applyCreditEvent is idempotent by idempotency key', async () => {
    const tx = {
      creditEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-event' }),
        create: jest.fn()
      },
      userCredit: {
        findUnique: jest.fn(),
        upsert: jest.fn()
      }
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx))
    };

    const service = new CreditsService(prisma as never);

    await service.applyCreditEvent({
      userId: 'u1',
      eventType: CreditEventType.grant,
      amount: 25,
      idempotencyKey: 'grant:u1:1'
    });

    expect(tx.creditEvent.create).not.toHaveBeenCalled();
    expect(tx.userCredit.upsert).not.toHaveBeenCalled();
  });

  it('applyCreditEvent rejects negative resulting balance', async () => {
    const tx = {
      creditEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn()
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({ balance: 10 }),
        upsert: jest.fn()
      }
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx))
    };

    const service = new CreditsService(prisma as never);

    await expect(
      service.applyCreditEvent({
        userId: 'u1',
        eventType: CreditEventType.spend,
        amount: -11,
        idempotencyKey: 'spend:u1:1'
      })
    ).rejects.toMatchObject({
      response: {
        message: 'Insufficient credits'
      }
    });

    expect(tx.creditEvent.create).not.toHaveBeenCalled();
    expect(tx.userCredit.upsert).not.toHaveBeenCalled();
  });
});
