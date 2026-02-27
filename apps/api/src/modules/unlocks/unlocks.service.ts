import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { ProgressStatus, UnlockRuleType, UnlockScopeType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { UnlockDecisionDto } from './dto';

type ModuleRule = {
  id: string;
  ruleType: UnlockRuleType;
  ruleConfigJson: unknown;
};

@Injectable()
export class UnlocksService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getModuleStatus(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const module = await this.getModuleOrThrow(moduleId);

    const existingUnlock = await this.findExistingModuleUnlock(normalizedUserId, module.id);
    if (existingUnlock) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const rules = await this.getActiveModuleRules(module.id);
    const reasons = await this.evaluateRules(normalizedUserId, rules);
    return this.buildDecision(module.id, module.creditsCost, reasons);
  }

  async evaluateModuleUnlock(userId: string, moduleId: string): Promise<UnlockDecisionDto> {
    const normalizedUserId = await this.assertKnownUser(userId);
    const module = await this.getModuleOrThrow(moduleId);

    const existingUnlock = await this.findExistingModuleUnlock(normalizedUserId, module.id);
    if (existingUnlock) {
      return this.buildDecision(module.id, module.creditsCost, []);
    }

    const rules = await this.getActiveModuleRules(module.id);
    const reasons = await this.evaluateRules(normalizedUserId, rules);
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
      throw new BadRequestException('x-user-id header is required');
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

  private async evaluateRules(userId: string, rules: ModuleRule[]): Promise<string[]> {
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
}
