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
    await this.assertKnownUser(userId);

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

    const rules = await this.getActiveModuleRules(module.id);
    const reasons: string[] = [];

    for (const rule of rules) {
      if (rule.ruleType === UnlockRuleType.prereq_sections) {
        const unmetReasons = await this.evaluatePrereqSectionsRule(userId.trim(), rule);
        reasons.push(...unmetReasons);
        continue;
      }

      reasons.push(`Unsupported unlock rule in PR-20: ${rule.ruleType}`);
    }

    return {
      moduleId: module.id,
      isUnlocked: reasons.length === 0,
      reasons,
      requiresCredits: module.creditsCost > 0,
      creditsCost: module.creditsCost
    };
  }

  private async assertKnownUser(userId: string): Promise<void> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('x-user-id header is required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId.trim() },
      select: { id: true }
    });

    if (!user) {
      throw new BadRequestException(`Unknown user: ${userId}`);
    }
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

  private async evaluatePrereqSectionsRule(userId: string, rule: ModuleRule): Promise<string[]> {
    const sectionIds = this.validatePrereqRuleConfig(rule.ruleConfigJson, rule.id);

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

  private validatePrereqRuleConfig(ruleConfigJson: unknown, ruleId: string): string[] {
    if (!ruleConfigJson || typeof ruleConfigJson !== 'object' || Array.isArray(ruleConfigJson)) {
      throw new InternalServerErrorException(`Malformed prereq_sections rule config for rule ${ruleId}`);
    }

    const sectionIds = (ruleConfigJson as { section_ids?: unknown }).section_ids;
    if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
      throw new InternalServerErrorException(`Malformed prereq_sections rule config for rule ${ruleId}`);
    }

    const normalized = sectionIds
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);

    if (normalized.length === 0) {
      throw new InternalServerErrorException(`Malformed prereq_sections rule config for rule ${ruleId}`);
    }

    return Array.from(new Set(normalized));
  }
}
