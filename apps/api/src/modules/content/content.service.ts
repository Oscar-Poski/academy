import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SectionVersionStatus } from '@prisma/client';
import {
  ContentLockMetadataDto,
  ModuleDetailDto,
  PathListItemDto,
  PathTreeDto,
  SectionDetailDto,
  SectionNavigationDto
} from './dto';
import { PrismaService } from '../../prisma/prisma.service';
import { UnlocksService } from '../unlocks/unlocks.service';

@Injectable()
export class ContentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(UnlocksService) private readonly unlocksService: UnlocksService
  ) {}

  async getPaths(): Promise<PathListItemDto[]> {
    const paths = await this.prisma.path.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        _count: {
          select: {
            modules: true
          }
        },
        modules: {
          select: {
            _count: {
              select: {
                sections: true
              }
            }
          }
        }
      }
    });

    return paths.map((path) => ({
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      moduleCount: path._count.modules,
      sectionCount: path.modules.reduce((sum, module) => sum + module._count.sections, 0)
    }));
  }

  async getPathTree(pathId: string, userId?: string): Promise<PathTreeDto> {
    const path = await this.prisma.path.findUnique({
      where: { id: pathId },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        modules: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            sortOrder: true,
            sections: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                slug: true,
                title: true,
                sortOrder: true
              }
            }
          }
        }
      }
    });

    if (!path) {
      throw new NotFoundException(`Path ${pathId} not found`);
    }

    const knownUserId = await this.resolveKnownUserIdForLockContext(userId);
    if (!knownUserId) {
      return path;
    }

    const lockByModuleId = new Map<string, ContentLockMetadataDto>();
    await Promise.all(
      path.modules.map(async (module) => {
        const lock = await this.getModuleLockMetadata(module.id, knownUserId);
        if (lock) {
          lockByModuleId.set(module.id, lock);
        }
      })
    );

    return {
      ...path,
      modules: path.modules.map((module) => {
        const lock = lockByModuleId.get(module.id);
        if (!lock) {
          return module;
        }

        return {
          ...module,
          lock,
          sections: module.sections.map((section) => ({
            ...section,
            lock
          }))
        };
      })
    };
  }

  async getModule(moduleId: string, userId?: string): Promise<ModuleDetailDto> {
    const module = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        pathId: true,
        slug: true,
        title: true,
        description: true,
        sortOrder: true,
        sections: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            slug: true,
            title: true,
            sortOrder: true
          }
        }
      }
    });

    if (!module) {
      throw new NotFoundException(`Module ${moduleId} not found`);
    }

    const knownUserId = await this.resolveKnownUserIdForLockContext(userId);
    if (!knownUserId) {
      return module;
    }

    const lock = await this.getModuleLockMetadata(module.id, knownUserId);
    if (!lock) {
      return module;
    }

    return {
      ...module,
      lock,
      sections: module.sections.map((section) => ({
        ...section,
        lock
      }))
    };
  }

  async getSection(sectionId: string, userId?: string): Promise<SectionDetailDto> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: {
        id: true,
        moduleId: true,
        slug: true,
        title: true,
        sortOrder: true
      }
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    const sectionVersion = await this.resolveSectionVersion(sectionId, userId);

    if (!sectionVersion) {
      throw new NotFoundException('No published version for section');
    }

    const siblings = await this.prisma.section.findMany({
      where: { moduleId: section.moduleId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true }
    });

    const currentIndex = siblings.findIndex((sibling) => sibling.id === section.id);

    const navigation: SectionNavigationDto = {
      prevSectionId: currentIndex > 0 ? siblings[currentIndex - 1].id : null,
      nextSectionId:
        currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1].id : null
    };

    const knownUserId = await this.resolveKnownUserIdForLockContext(userId);
    if (knownUserId) {
      const moduleLock = await this.getModuleLockMetadata(section.moduleId, knownUserId);
      if (moduleLock) {
        navigation.prevSectionLock = navigation.prevSectionId ? moduleLock : null;
        navigation.nextSectionLock = navigation.nextSectionId ? moduleLock : null;
      }
    }

    return {
      ...section,
      sectionVersionId: sectionVersion.id,
      lessonBlocks: sectionVersion.lessonBlocks,
      navigation
    };
  }

  private async resolveKnownUserIdForLockContext(userId?: string): Promise<string | null> {
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return null;
    }

    const normalizedUserId = userId.trim();
    const user = await this.prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true }
    });

    if (!user) {
      return null;
    }

    return normalizedUserId;
  }

  private async getModuleLockMetadata(
    moduleId: string,
    knownUserId: string
  ): Promise<ContentLockMetadataDto | null> {
    try {
      const decision = await this.unlocksService.getModuleStatusForKnownUser(knownUserId, moduleId);
      return {
        isLocked: !decision.isUnlocked,
        reasons: decision.reasons,
        requiresCredits: decision.requiresCredits,
        creditsCost: decision.creditsCost
      };
    } catch {
      return null;
    }
  }

  private async resolveSectionVersion(sectionId: string, userId?: string) {
    if (userId && userId.trim().length > 0) {
      const progress = await this.prisma.userSectionProgress.findFirst({
        where: {
          userId: userId.trim(),
          sectionId
        },
        select: {
          sectionVersionId: true
        }
      });

      if (progress) {
        const pinnedVersion = await this.prisma.sectionVersion.findFirst({
          where: {
            id: progress.sectionVersionId,
            sectionId,
            status: { in: [SectionVersionStatus.published, SectionVersionStatus.archived] }
          },
          select: {
            id: true,
            lessonBlocks: {
              orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }],
              select: {
                id: true,
                blockOrder: true,
                blockType: true,
                contentJson: true,
                estimatedSeconds: true
              }
            }
          }
        });

        if (pinnedVersion) {
          return pinnedVersion;
        }
      }
    }

    return this.prisma.sectionVersion.findFirst({
      where: {
        sectionId,
        status: SectionVersionStatus.published
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        lessonBlocks: {
          orderBy: [{ blockOrder: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            blockOrder: true,
            blockType: true,
            contentJson: true,
            estimatedSeconds: true
          }
        }
      }
    });
  }
}
