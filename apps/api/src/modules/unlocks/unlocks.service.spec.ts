import { UnlockRuleType, UnlockScopeType } from '@prisma/client';
import { UnlocksService } from './unlocks.service';

describe('UnlocksService', () => {
  it('returns deterministic credits reason for credits rules', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 100 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.credits,
            ruleConfigJson: {}
          }
        ])
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({ balance: 0 })
      }
    };
    const creditsService = {
      applyCreditEvent: jest.fn()
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    const result = await service.getModuleStatus('u1', 'm1');
    expect(result.isUnlocked).toBe(false);
    expect(result.reasons).toContain('Redeem credits to unlock module: m1');
    expect(result.reasons.some((reason) => reason.includes('Unsupported unlock rule'))).toBe(false);
  });

  it('redeem rejects when non-credit prerequisites are unmet', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 100 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.prereq_sections,
            ruleConfigJson: {
              section_ids: ['s1']
            }
          },
          {
            id: 'r2',
            ruleType: UnlockRuleType.credits,
            ruleConfigJson: {}
          }
        ])
      },
      userSectionProgress: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    const creditsService = {
      applyCreditEvent: jest.fn()
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    await expect(service.redeemModuleCredits('u1', 'm1')).rejects.toMatchObject({
      response: {
        code: 'unlock_blocked',
        message: 'Module unlock prerequisites are not met',
        reasons: ['Complete prerequisite section: s1']
      }
    });
    expect(creditsService.applyCreditEvent).not.toHaveBeenCalled();
  });

  it('redeem rejects insufficient credits with deterministic payload', async () => {
    const tx = {
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn()
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({ balance: 20 })
      }
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 100 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.credits,
            ruleConfigJson: {}
          }
        ])
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx))
    };
    const creditsService = {
      applyCreditEvent: jest.fn()
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    await expect(service.redeemModuleCredits('u1', 'm1')).rejects.toMatchObject({
      response: {
        code: 'insufficient_credits',
        message: 'Insufficient credits',
        required: 100,
        balance: 20
      }
    });
    expect(creditsService.applyCreditEvent).not.toHaveBeenCalled();
  });

  it('redeem succeeds and persists unlock with a single spend operation', async () => {
    const tx = {
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'unlock-1' })
      },
      userCredit: {
        findUnique: jest.fn().mockResolvedValue({ balance: 150 })
      }
    };
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 100 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.credits,
            ruleConfigJson: {}
          }
        ])
      },
      $transaction: jest.fn().mockImplementation(async (callback) => callback(tx))
    };
    const creditsService = {
      applyCreditEvent: jest.fn().mockResolvedValue({
        balance: 50,
        applied: true
      })
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    await expect(service.redeemModuleCredits('u1', 'm1')).resolves.toEqual({
      moduleId: 'm1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: true,
      creditsCost: 100
    });
    expect(creditsService.applyCreditEvent).toHaveBeenCalledWith(
      {
        userId: 'u1',
        eventType: 'spend',
        amount: -100,
        idempotencyKey: 'unlock_redeem:u1:m1',
        reason: 'unlock_redeem:m1'
      },
      tx
    );
    expect(tx.userUnlock.upsert).toHaveBeenCalledWith({
      where: {
        userId_scopeType_scopeId: {
          userId: 'u1',
          scopeType: UnlockScopeType.module,
          scopeId: 'm1'
        }
      },
      update: {},
      create: {
        userId: 'u1',
        scopeType: UnlockScopeType.module,
        scopeId: 'm1',
        reason: 'credits_redeemed'
      }
    });
  });

  it('redeem replay returns unlocked without additional spend', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 100 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue({ id: 'unlock-existing' })
      }
    };
    const creditsService = {
      applyCreditEvent: jest.fn()
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    await expect(service.redeemModuleCredits('u1', 'm1')).resolves.toEqual({
      moduleId: 'm1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: true,
      creditsCost: 100
    });
    expect(creditsService.applyCreditEvent).not.toHaveBeenCalled();
  });
});
