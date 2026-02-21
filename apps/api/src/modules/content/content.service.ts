import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SectionVersionStatus } from '@prisma/client';
import {
  ModuleDetailDto,
  PathListItemDto,
  PathTreeDto,
  SectionDetailDto,
  SectionNavigationDto
} from './dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  async getPathTree(pathId: string): Promise<PathTreeDto> {
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

    return path;
  }

  async getModule(moduleId: string): Promise<ModuleDetailDto> {
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

    return module;
  }

  async getSection(sectionId: string): Promise<SectionDetailDto> {
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

    const sectionVersion = await this.prisma.sectionVersion.findFirst({
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

    if (!sectionVersion) {
      throw new NotFoundException(`Section ${sectionId} has no published version`);
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

    return {
      ...section,
      sectionVersionId: sectionVersion.id,
      lessonBlocks: sectionVersion.lessonBlocks,
      navigation
    };
  }
}
