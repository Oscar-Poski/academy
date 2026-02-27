import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { ProgressStatus, SectionVersionStatus, UserSectionProgress } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';
import { UnlocksService } from '../unlocks/unlocks.service';
import type {
  CompleteSectionGatingErrorDto,
  ContinueLearningDto,
  ModuleProgressDto,
  PathProgressDto,
  SectionProgressDto,
  UpdateSectionPositionDto
} from './dto';

@Injectable()
export class ProgressService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GamificationService) private readonly gamificationService: GamificationService,
    @Inject(UnlocksService) private readonly unlocksService: UnlocksService
  ) {}

  async startSection(userId: string, sectionId: string): Promise<SectionProgressDto> {
    await this.assertKnownUser(userId);

    const now = new Date();
    const progress = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.userSectionProgress.findUnique({
        where: { userId_sectionId: { userId, sectionId } }
      });

      if (existing) {
        if (existing.status === ProgressStatus.completed) {
          return existing;
        }

        const updated = await tx.userSectionProgress.update({
          where: { id: existing.id },
          data: {
            status: ProgressStatus.in_progress,
            startedAt: existing.startedAt ?? now,
            lastSeenAt: now
          }
        });

        return updated;
      }

      const section = await tx.section.findUnique({ where: { id: sectionId }, select: { id: true } });
      if (!section) {
        throw new NotFoundException(`Section ${sectionId} not found`);
      }

      const publishedVersion = await tx.sectionVersion.findFirst({
        where: { sectionId, status: SectionVersionStatus.published },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        select: { id: true }
      });

      if (!publishedVersion) {
        throw new NotFoundException(`Section ${sectionId} has no published version`);
      }

      return tx.userSectionProgress.create({
        data: {
          userId,
          sectionId,
          sectionVersionId: publishedVersion.id,
          status: ProgressStatus.in_progress,
          startedAt: now,
          lastSeenAt: now,
          completionPct: 0,
          timeSpentSeconds: 0
        }
      });
    });

    // TODO(content-versioning): Content fetch is still published-only in PR-4; user-pinned section_version_id
    // should be used by a version-aware content endpoint in a future PR.
    return this.toSectionProgressDto(progress);
  }

  async updateSectionPosition(
    userId: string,
    sectionId: string,
    body: UpdateSectionPositionDto
  ): Promise<SectionProgressDto> {
    await this.assertKnownUser(userId);
    this.validatePositionBody(body);

    const ensured = await this.startSection(userId, sectionId);
    const now = new Date();

    const updated = await this.prisma.userSectionProgress.update({
      where: { id: ensured.id },
      data: {
        lastSeenAt: now,
        lastBlockOrder:
          ensured.lastBlockOrder == null
            ? body.last_block_order
            : Math.max(ensured.lastBlockOrder, body.last_block_order),
        timeSpentSeconds: {
          increment: Math.max(0, body.time_spent_delta)
        },
        completionPct:
          ensured.status === 'completed'
            ? 100
            : body.completion_pct == null
              ? ensured.completionPct
              : Math.max(ensured.completionPct, this.clampPct(body.completion_pct)),
        status: ensured.status === 'completed' ? ProgressStatus.completed : undefined
      }
    });

    // NOTE: time_spent_delta is best-effort and not fully idempotent without request/event IDs.
    return this.toSectionProgressDto(updated);
  }

  async completeSection(userId: string, sectionId: string): Promise<SectionProgressDto> {
    await this.assertKnownUser(userId);

    const existing = await this.prisma.userSectionProgress.findUnique({
      where: { userId_sectionId: { userId, sectionId } }
    });
    if (existing && existing.status === ProgressStatus.completed) {
      return this.toSectionProgressDto(existing);
    }

    await this.assertCanCompleteSection(userId, sectionId);

    const ensured = await this.startSection(userId, sectionId);
    if (ensured.status === 'completed') {
      return ensured;
    }

    const now = new Date();
    const updated = await this.prisma.$transaction(async (tx) => {
      const completed = await tx.userSectionProgress.update({
        where: { id: ensured.id },
        data: {
          status: ProgressStatus.completed,
          completionPct: 100,
          completedAt: now,
          lastSeenAt: now
        }
      });

      await this.gamificationService.awardSectionCompleteXp(userId, sectionId, tx);

      return completed;
    });

    return this.toSectionProgressDto(updated);
  }

  private async assertCanCompleteSection(userId: string, sectionId: string): Promise<void> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        moduleId: true,
        hasQuiz: true
      }
    });
    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    const reasons: string[] = [];
    let requiresQuizPass = false;
    let requiresUnlock = false;

    if (section.hasQuiz) {
      const latestQuizPassed = await this.getLatestQuizPassState(userId, section.id);
      if (!latestQuizPassed) {
        requiresQuizPass = true;
        reasons.push('Pass quiz before completing this section.');
      }
    }

    const unlockDecision = await this.unlocksService.getModuleStatusForKnownUser(userId, section.moduleId);
    if (!unlockDecision.isUnlocked) {
      const selfPrereqReason = `Complete prerequisite section: ${section.id}`;
      const blockingUnlockReasons = unlockDecision.reasons.filter((reason) => reason !== selfPrereqReason);
      if (blockingUnlockReasons.length > 0) {
        requiresUnlock = true;
        reasons.push(...blockingUnlockReasons);
      }
    }

    if (reasons.length > 0) {
      throw this.buildCompletionBlockedError(Array.from(new Set(reasons)), {
        requiresQuizPass,
        requiresUnlock
      });
    }
  }

  private async getLatestQuizPassState(userId: string, sectionId: string): Promise<boolean> {
    const latest = await this.prisma.quizAttempt.findFirst({
      where: {
        userId,
        sectionId
      },
      orderBy: [{ submittedAt: 'desc' }, { attemptNo: 'desc' }, { id: 'asc' }],
      select: {
        passed: true
      }
    });

    return latest?.passed === true;
  }

  private buildCompletionBlockedError(
    reasons: string[],
    flags: { requiresQuizPass: boolean; requiresUnlock: boolean }
  ): ConflictException {
    const body: CompleteSectionGatingErrorDto = {
      code: 'completion_blocked',
      reasons,
      requiresQuizPass: flags.requiresQuizPass,
      requiresUnlock: flags.requiresUnlock
    };

    return new ConflictException(body);
  }

  async getSectionProgress(userId: string, sectionId: string): Promise<SectionProgressDto> {
    await this.assertKnownUser(userId);

    const progress = await this.prisma.userSectionProgress.findUnique({
      where: { userId_sectionId: { userId, sectionId } }
    });

    if (!progress) {
      throw new NotFoundException(`Progress for section ${sectionId} not found`);
    }

    return this.toSectionProgressDto(progress);
  }

  async getModuleProgress(userId: string, moduleId: string): Promise<ModuleProgressDto> {
    await this.assertKnownUser(userId);

    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        sections: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: { id: true }
        }
      }
    });

    if (!module) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }

    const sectionIds = module.sections.map((s) => s.id);
    const progressRows = sectionIds.length
      ? await this.prisma.userSectionProgress.findMany({
          where: { userId, sectionId: { in: sectionIds } },
          select: {
            sectionId: true,
            sectionVersionId: true,
            status: true,
            completionPct: true,
            lastBlockOrder: true,
            lastSeenAt: true,
            completedAt: true
          }
        })
      : [];

    const bySectionId = new Map(progressRows.map((row) => [row.sectionId, row]));
    const sections = module.sections.map((section) => {
      const row = bySectionId.get(section.id);
      return {
        sectionId: section.id,
        status: row?.status ?? 'not_started',
        completionPct: row?.completionPct ?? 0,
        lastBlockOrder: row?.lastBlockOrder ?? null,
        lastSeenAt: row?.lastSeenAt?.toISOString() ?? null,
        completedAt: row?.completedAt?.toISOString() ?? null,
        sectionVersionId: row?.sectionVersionId ?? null
      };
    });

    const totalSections = sections.length;
    const completedSections = sections.filter((section) => section.status === 'completed').length;
    const completionPct = totalSections === 0 ? 0 : Math.floor((completedSections / totalSections) * 100);

    return {
      moduleId: module.id,
      completionPct,
      completedSections,
      totalSections,
      sections
    };
  }

  async getPathProgress(userId: string, pathId: string): Promise<PathProgressDto> {
    await this.assertKnownUser(userId);

    const path = await this.prisma.path.findUnique({
      where: { id: pathId },
      select: {
        id: true,
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            sections: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
              select: { id: true }
            }
          }
        }
      }
    });

    if (!path) {
      throw new NotFoundException(`Path ${pathId} not found`);
    }

    const allSectionIds = path.modules.flatMap((module) => module.sections.map((section) => section.id));
    const progressRows = allSectionIds.length
      ? await this.prisma.userSectionProgress.findMany({
          where: { userId, sectionId: { in: allSectionIds } },
          select: {
            sectionId: true,
            status: true
          }
        })
      : [];
    const progressBySectionId = new Map(progressRows.map((row) => [row.sectionId, row]));

    const modules = path.modules.map((module) => {
      const totalSections = module.sections.length;
      const completedSections = module.sections.filter(
        (section) => progressBySectionId.get(section.id)?.status === ProgressStatus.completed
      ).length;
      const completionPct = totalSections === 0 ? 0 : Math.floor((completedSections / totalSections) * 100);

      return {
        moduleId: module.id,
        completionPct,
        completedSections,
        totalSections
      };
    });

    const totalModules = modules.length;
    const completedModules = modules.filter((module) => module.totalSections > 0 && module.completionPct === 100).length;
    const totalSections = modules.reduce((sum, module) => sum + module.totalSections, 0);
    const completedSections = modules.reduce((sum, module) => sum + module.completedSections, 0);
    const completionPct = totalSections === 0 ? 0 : Math.floor((completedSections / totalSections) * 100);

    return {
      pathId: path.id,
      completionPct,
      completedModules,
      totalModules,
      modules
    };
  }

  async getContinue(userId: string): Promise<ContinueLearningDto> {
    await this.assertKnownUser(userId);

    const recent = await this.prisma.userSectionProgress.findFirst({
      where: {
        userId,
        status: ProgressStatus.in_progress
      },
      orderBy: [{ lastSeenAt: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
      select: {
        lastSeenAt: true,
        section: {
          select: {
            id: true,
            title: true,
            module: {
              select: {
                id: true,
                title: true,
                path: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (recent) {
      return {
        source: 'resume',
        sectionId: recent.section.id,
        moduleId: recent.section.module.id,
        pathId: recent.section.module.path.id,
        sectionTitle: recent.section.title,
        moduleTitle: recent.section.module.title,
        pathTitle: recent.section.module.path.title,
        lastSeenAt: recent.lastSeenAt?.toISOString() ?? null
      };
    }

    const firstPath = await this.prisma.path.findFirst({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        title: true,
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          take: 1,
          select: {
            id: true,
            title: true,
            sections: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
              take: 1,
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });

    if (!firstPath || firstPath.modules.length === 0 || firstPath.modules[0].sections.length === 0) {
      throw new NotFoundException('No content available for continue learning');
    }

    const firstModule = firstPath.modules[0];
    const firstSection = firstModule.sections[0];

    return {
      source: 'fallback',
      sectionId: firstSection.id,
      moduleId: firstModule.id,
      pathId: firstPath.id,
      sectionTitle: firstSection.title,
      moduleTitle: firstModule.title,
      pathTitle: firstPath.title,
      lastSeenAt: null
    };
  }

  private async assertKnownUser(userId: string): Promise<void> {
    if (!userId || userId.trim().length === 0) {
      throw new BadRequestException('Missing user id');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new BadRequestException('Unknown user');
    }
  }

  private validatePositionBody(body: UpdateSectionPositionDto): void {
    if (!Number.isInteger(body.last_block_order) || body.last_block_order < 0) {
      throw new BadRequestException('last_block_order must be a non-negative integer');
    }

    if (!Number.isInteger(body.time_spent_delta)) {
      throw new BadRequestException('time_spent_delta must be an integer');
    }

    if (body.completion_pct != null && !Number.isInteger(body.completion_pct)) {
      throw new BadRequestException('completion_pct must be an integer when provided');
    }
  }

  private clampPct(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  private toSectionProgressDto(progress: UserSectionProgress): SectionProgressDto {
    return {
      id: progress.id,
      userId: progress.userId,
      sectionId: progress.sectionId,
      sectionVersionId: progress.sectionVersionId,
      status: progress.status,
      startedAt: progress.startedAt?.toISOString() ?? null,
      lastSeenAt: progress.lastSeenAt?.toISOString() ?? null,
      completedAt: progress.completedAt?.toISOString() ?? null,
      completionPct: progress.completionPct,
      lastBlockOrder: progress.lastBlockOrder ?? null,
      timeSpentSeconds: progress.timeSpentSeconds
    };
  }
}
