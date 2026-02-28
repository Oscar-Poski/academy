import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { Prisma, ProgressStatus, UnlockRuleType, UnlockScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import type { InsufficientCreditsErrorDto, UnlockBlockedErrorDto, UnlockDecisionDto } from './dto';

type ModuleRule = {
  id: string;
  ruleType: UnlockRuleType;
  ruleConfigJson: unknown;
};

@Injectable()
export class UnlocksService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CreditsService) private readonly creditsService: CreditsService
  ) {}

  async getModuleStatus(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    return this.getModuleStatusForKnownUser(normalizedUserId, moduleId);
  }

  async getModuleStatusForKnownUser(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const module = await this.getModuleOrThrow(moduleId);
    return this.getModuleStatusForKnownUserAndModule(userId, module);
  }

  async evaluateModuleUnlock(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const module = await this.getModuleOrThrow(moduleId);

    const existingUnlock = await this.findExistingModuleUnlock(normalizedUserId, module.id);
    if (existingUnlock) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const rules = await this.getActiveModuleRules(module.id);
    const reasons = await this.evaluateRules(normalizedUserId, module, rules);
    if (reasons.length > 0) {
      return this.buildDecision(module.id, module.creditsCost, reasons);
    }

    await this.prisma.userUnlock.upsert({
      where: {
        userId_scopeType_scopeId: {
          userId: normalizedUserId,
          scopeType: UnlockScopeType.module,
          scopeId: module.id
        }
      },
      update: {},
      create: {
        userId: normalizedUserId,
        scopeType: UnlockScopeType.module,
        scopeId: module.id,
        reason: 'rules_satisfied'
      }
    });

    return this.buildDecision(module.id, module.creditsCost, []);
  }

  async redeemModuleCredits(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const module = await this.getModuleOrThrow(moduleId);

    const existingUnlock = await this.findExistingModuleUnlock(normalizedUserId, module.id);
    if (existingUnlock) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const rules = await this.getActiveModuleRules(module.id);
    const nonCreditRules = rules.filter((rule) => rule.ruleType !== UnlockRuleType.credits);
    const creditRules = rules.filter((rule) => rule.ruleType === UnlockRuleType.credits);

    const nonCreditReasons = await this.evaluateRules(normalizedUserId, module, nonCreditRules);
    if (nonCreditReasons.length > 0) {
      throw this.buildUnlockBlockedError(nonCreditReasons);
    }

    if (creditRules.length === 0 || module.creditsCost <= 0) {
      await this.prisma.userUnlock.upsert({
        where: {
          userId_scopeType_scopeId: {
            userId: normalizedUserId,
            scopeType: UnlockScopeType.module,
            scopeId: module.id
          }
        },
        update: {},
        create: {
          userId: normalizedUserId,
          scopeType: UnlockScopeType.module,
          scopeId: module.id,
          reason: 'rules_satisfied'
        }
      });

      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const idempotencyKey = `unlock_redeem:${normalizedUserId}:${module.id}`;
    const result = await this.prisma.$transaction(async (tx) => {
      const txExistingUnlock = await tx.userUnlock.findUnique({
        where: {
          userId_scopeType_scopeId: {
            userId: normalizedUserId,
            scopeType: UnlockScopeType.module,
            scopeId: module.id
          }
        },
        select: { id: true }
      });
      if (txExistingUnlock) {
        return { alreadyUnlocked: true };
      }

      const balance = await this.getUserCreditsBalance(normalizedUserId, tx);
      if (balance < module.creditsCost) {
        throw this.buildInsufficientCreditsError(module.creditsCost, balance);
      }

      await this.creditsService.applyCreditEvent(
        {
          userId: normalizedUserId,
          eventType: 'spend',
          amount: -module.creditsCost,
          idempotencyKey,
          reason: `unlock_redeem:${module.id}`
        },
        tx
      );

      await tx.userUnlock.upsert({
        where: {
          userId_scopeType_scopeId: {
            userId: normalizedUserId,
            scopeType: UnlockScopeType.module,
            scopeId: module.id
          }
        },
        update: {},
        create: {
          userId: normalizedUserId,
          scopeType: UnlockScopeType.module,
          scopeId: module.id,
          reason: 'credits_redeemed'
        }
      });

      return { alreadyUnlocked: false };
    });

    if (result.alreadyUnlocked) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    return this.buildDecision(module.id, module.creditsCost, []);
  }

  private async getModuleStatusForKnownUserAndModule(
    userId: string,
    module: { id: string; creditsCost: number }
  ): Promise<UnlockDecisionDto> {
    const existingUnlock = await this.findExistingModuleUnlock(userId, module.id);
    if (existingUnlock) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const rules = await this.getActiveModuleRules(module.id);
    const reasons = await this.evaluateRules(userId, module, rules);
    return this.buildDecision(module.id, module.creditsCost, reasons);
  }

  private buildDecision(moduleId: string, creditsCost: number, reasons: string[]): UnlockDecisionDto {
    return {
      moduleId,
      isUnlocked: reasons.length === 0,
      reasons,
      requiresCredits: creditsCost > 0,
      creditsCost
    };
  }

  private async assertKnownUser(userId: string): Promise<string> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('user id is required');
    }

    const normalizedUserId = userId.trim();
    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }

    return normalizedUserId;
  }

  private async getModuleOrThrow(moduleId: string): Promise<{ id: string; creditsCost: number }> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        creditsCost: true
      }
    });

    if (!module) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }

    return module;
  }

  private findExistingModuleUnlock(userId: string, moduleId: string): Promise<{ id: string } | null> {
    return this.prisma.userUnlock.findUnique({
      where: {
        userId_scopeType_scopeId: {
          userId,
          scopeType: UnlockScopeType.module,
          scopeId: moduleId
        }
      },
      select: { id: true }
    });
  }

  private async getActiveModuleRules(moduleId: string): Promise<ModuleRule[]> {
    return this.prisma.unlockRule.findMany({
      where: {
        scopeType: UnlockScopeType.module,
        scopeId: moduleId,
        isActive: true
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        ruleType: true,
        ruleConfigJson: true
      }
    });
  }

  private async evaluateRules(
    userId: string,
    module: { id: string; creditsCost: number },
    rules: ModuleRule[]
  ): Promise<string[]> {
    const reasons: string[] = [];

    for (const rule of rules) {
      if (rule.ruleType === UnlockRuleType.prereq_sections) {
        const unmetReasons = await this.evaluatePrereqSectionsRule(userId, rule);
        reasons.push(...unmetReasons);
        continue;
      }

      if (rule.ruleType === UnlockRuleType.quiz_pass) {
        const unmetReasons = await this.evaluateQuizPassRule(userId, rule);
        reasons.push(...unmetReasons);
        continue;
      }

      if (rule.ruleType === UnlockRuleType.credits) {
        const unmetReasons = await this.evaluateCreditsRule(userId, module);
        reasons.push(...unmetReasons);
        continue;
      }

      if (rule.ruleType === UnlockRuleType.min_level) {
        const unmetReasons = await this.evaluateMinLevelRule(userId, module, rule);
        reasons.push(...unmetReasons);
        continue;
      }

      reasons.push(`Unsupported unlock rule in PR-21: ${rule.ruleType}`);
    }

    return reasons;
  }

  private async evaluatePrereqSectionsRule(userId: string, rule: ModuleRule): Promise<string[]> {
    const sectionIds = this.validateSectionIdsRuleConfig(
      rule.ruleConfigJson,
      rule.id,
      UnlockRuleType.prereq_sections
    );

    const completedRows = await this.prisma.userSectionProgress.findMany({
      where: {
        userId,
        sectionId: { in: sectionIds },
        status: ProgressStatus.completed
      },
      select: {
        sectionId: true
      }
    });

    const completed = new Set(completedRows.map((row) => row.sectionId));
    const reasons: string[] = [];

    for (const sectionId of sectionIds) {
      if (!completed.has(sectionId)) {
        reasons.push(`Complete prerequisite section: ${sectionId}`);
      }
    }

    return reasons;
  }

  private async evaluateQuizPassRule(userId: string, rule: ModuleRule): Promise<string[]> {
    const sectionIds = this.validateSectionIdsRuleConfig(
      rule.ruleConfigJson,
      rule.id,
      UnlockRuleType.quiz_pass
    );
    const reasons: string[] = [];

    for (const sectionId of sectionIds) {
      const latestAttempt = await this.prisma.quizAttempt.findFirst({
        where: {
          userId,
          sectionId
        },
        orderBy: [{ submittedAt: 'desc' }, { attemptNo: 'desc' }, { id: 'asc' }],
        select: {
          passed: true
        }
      });

      if (!latestAttempt || latestAttempt.passed !== true) {
        reasons.push(`Pass quiz for section: ${sectionId}`);
      }
    }

    return reasons;
  }

  private async evaluateCreditsRule(
    userId: string,
    module: { id: string; creditsCost: number }
  ): Promise<string[]> {
    if (module.creditsCost <= 0) {
      return [];
    }

    const balance = await this.getUserCreditsBalance(userId);
    if (balance < module.creditsCost) {
      return [`Redeem credits to unlock module: ${module.id}`];
    }

    return [`Redeem credits to unlock module: ${module.id}`];
  }

  private async evaluateMinLevelRule(
    userId: string,
    module: { id: string },
    rule: ModuleRule
  ): Promise<string[]> {
    const requiredLevel = this.validateMinLevelRuleConfig(rule.ruleConfigJson, rule.id);
    const userLevel = await this.getUserLevel(userId);

    if (userLevel < requiredLevel) {
      return [`Reach level ${requiredLevel} to unlock module: ${module.id}`];
    }

    return [];
  }

  private async getUserLevel(userId: string): Promise<number> {
    const row = await this.prisma.userLevel.findUnique({
      where: { userId },
      select: { level: true }
    });

    return row?.level ?? 1;
  }

  private async getUserCreditsBalance(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    const client = tx ?? this.prisma;
    const wallet = await client.userCredit.findUnique({
      where: { userId },
      select: { balance: true }
    });

    return wallet?.balance ?? 0;
  }

  private buildUnlockBlockedError(reasons: string[]): ConflictException {
    const payload: UnlockBlockedErrorDto = {
      code: 'unlock_blocked',
      message: 'Module unlock prerequisites are not met',
      reasons
    };

    return new ConflictException(payload);
  }

  private buildInsufficientCreditsError(required: number, balance: number): ConflictException {
    const payload: InsufficientCreditsErrorDto = {
      code: 'insufficient_credits',
      message: 'Insufficient credits',
      required,
      balance
    };

    return new ConflictException(payload);
  }

  private validateSectionIdsRuleConfig(
    ruleConfigJson: unknown,
    ruleId: string,
    ruleType: UnlockRuleType
  ): string[] {
    if (!ruleConfigJson || typeof ruleConfigJson !== 'object' || Array.isArray(ruleConfigJson)) {
      throw new InternalServerErrorException(`Malformed ${ruleType} rule config for rule ${ruleId}`);
    }

    const sectionIds = (ruleConfigJson as { section_ids?: unknown }).section_ids;
    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
      throw new InternalServerErrorException(`Malformed ${ruleType} rule config for rule ${ruleId}`);
    }

    const normalized = sectionIds
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);

    if (normalized.length === 0) {
      throw new InternalServerErrorException(`Malformed ${ruleType} rule config for rule ${ruleId}`);
    }

    return Array.from(new Set(normalized));
  }

  private validateMinLevelRuleConfig(ruleConfigJson: unknown, ruleId: string): number {
    if (!ruleConfigJson || typeof ruleConfigJson !== 'object' || Array.isArray(ruleConfigJson)) {
      throw new InternalServerErrorException(`Malformed ${UnlockRuleType.min_level} rule config for rule ${ruleId}`);
    }

    const raw = (ruleConfigJson as { min_level?: unknown }).min_level;
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1) {
      throw new InternalServerErrorException(`Malformed ${UnlockRuleType.min_level} rule config for rule ${ruleId}`);
    }

    return raw;
  }
}
