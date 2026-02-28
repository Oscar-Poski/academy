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

  it('returns deterministic min_level reason when user level is below required', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 0 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.min_level,
            ruleConfigJson: { min_level: 2 }
          }
        ])
      },
      userLevel: {
        findUnique: jest.fn().mockResolvedValue({ level: 1 })
      }
    };

    const service = new UnlocksService(prisma as never, { applyCreditEvent: jest.fn() } as never);

    await expect(service.getModuleStatus('u1', 'm1')).resolves.toEqual({
      moduleId: 'm1',
      isUnlocked: false,
      reasons: ['Reach level 2 to unlock module: m1'],
      requiresCredits: false,
      creditsCost: 0
    });
  });

  it('passes min_level rule when user level meets required threshold', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 0 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({ id: 'unlock-1' })
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.min_level,
            ruleConfigJson: { min_level: 2 }
          }
        ])
      },
      userLevel: {
        findUnique: jest.fn().mockResolvedValue({ level: 2 })
      }
    };

    const service = new UnlocksService(prisma as never, { applyCreditEvent: jest.fn() } as never);

    await expect(service.evaluateModuleUnlock('u1', 'm1')).resolves.toEqual({
      moduleId: 'm1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: false,
      creditsCost: 0
    });
  });

  it('defaults to level 1 when user_levels row is missing', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 0 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.min_level,
            ruleConfigJson: { min_level: 2 }
          }
        ])
      },
      userLevel: {
        findUnique: jest.fn().mockResolvedValue(null)
      }
    };

    const service = new UnlocksService(prisma as never, { applyCreditEvent: jest.fn() } as never);

    const status = await service.getModuleStatus('u1', 'm1');
    expect(status.isUnlocked).toBe(false);
    expect(status.reasons).toEqual(['Reach level 2 to unlock module: m1']);
  });

  it('throws internal error for malformed min_level rule config', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'u1' })
      },
      module: {
        findUnique: jest.fn().mockResolvedValue({ id: 'm1', creditsCost: 0 })
      },
      userUnlock: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      unlockRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'r1',
            ruleType: UnlockRuleType.min_level,
            ruleConfigJson: { min_level: 0 }
          }
        ])
      }
    };

    const service = new UnlocksService(prisma as never, { applyCreditEvent: jest.fn() } as never);

    await expect(service.getModuleStatus('u1', 'm1')).rejects.toMatchObject({
      response: {
        message: 'Malformed min_level rule config for rule r1'
      }
    });
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

  it('redeem is blocked by unmet min_level and does not spend credits', async () => {
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
            ruleType: UnlockRuleType.min_level,
            ruleConfigJson: { min_level: 3 }
          },
          {
            id: 'r2',
            ruleType: UnlockRuleType.credits,
            ruleConfigJson: {}
          }
        ])
      },
      userLevel: {
        findUnique: jest.fn().mockResolvedValue({ level: 2 })
      }
    };
    const creditsService = {
      applyCreditEvent: jest.fn()
    };

    const service = new UnlocksService(prisma as never, creditsService as never);

    await expect(service.redeemModuleCredits('u1', 'm1')).rejects.toMatchObject({
      response: {
        code: 'unlock_blocked',
        reasons: ['Reach level 3 to unlock module: m1']
      }
    });
    expect(creditsService.applyCreditEvent).not.toHaveBeenCalled();
  });
});
