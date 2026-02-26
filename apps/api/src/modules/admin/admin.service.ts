import {
  applyParsedContentReport,
  createDryRunApplyReport,
  parseContentBundle,
  type ContentImportApplyReport
} from '@academy/content-importer';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SectionVersionStatus } from '@prisma/client';
import path from 'node:path';
import type {
  ImportContentRequestDto,
  PublishSectionVersionResponseDto,
  SectionVersionDetailDto,
  SectionVersionSummaryDto
} from './dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async importContent(body: ImportContentRequestDto): Promise<ContentImportApplyReport> {
    const bundlePath = this.validateBundlePath(body?.bundle_path);
    const mode = this.validateMode(body?.mode);
    this.assertWithinConfiguredImportRoot(bundlePath);

    try {
      const parseReport = await parseContentBundle(bundlePath);

      if (mode === 'dryRun') {
        return createDryRunApplyReport(parseReport);
      }

      return applyParsedContentReport(parseReport, { prisma: this.prisma });
    } catch (error) {
      if (this.isPathAccessError(error)) {
        throw new BadRequestException(`bundle_path is not readable: ${bundlePath}`);
      }

      throw error;
    }
  }

  async listSectionVersions(sectionId: string): Promise<SectionVersionSummaryDto[]> {
    await this.assertSectionExists(sectionId);

    const versions = await this.prisma.sectionVersion.findMany({
      where: { sectionId },
      orderBy: [{ versionNumber: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        sectionId: true,
        versionNumber: true,
        status: true,
        changeLog: true,
        createdBy: true,
        createdAt: true,
        publishedAt: true,
        _count: {
          select: {
            lessonBlocks: true
          }
        }
      }
    });

    return versions.map((version) => this.toSectionVersionSummaryDto(version));
  }

  async getSectionVersion(sectionId: string, versionId: string): Promise<SectionVersionDetailDto> {
    const version = await this.getSectionVersionOrThrow(sectionId, versionId);

    return this.toSectionVersionDetailDto(version);
  }

  async publishSectionVersion(
    sectionId: string,
    versionId: string
  ): Promise<PublishSectionVersionResponseDto> {
    const targetVersion = await this.getSectionVersionOrThrow(sectionId, versionId);

    if (targetVersion.status !== SectionVersionStatus.draft) {
      throw new ConflictException('Only draft versions can be published');
    }

    const publishedAt = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const currentlyPublished = await tx.sectionVersion.findMany({
        where: {
          sectionId,
          status: SectionVersionStatus.published,
          id: { not: versionId }
        },
        select: { id: true }
      });

      if (currentlyPublished.length > 0) {
        await tx.sectionVersion.updateMany({
          where: {
            id: { in: currentlyPublished.map((version) => version.id) }
          },
          data: {
            status: SectionVersionStatus.archived
          }
        });
      }

      const publishedVersion = await tx.sectionVersion.update({
        where: { id: versionId },
        data: {
          status: SectionVersionStatus.published,
          publishedAt
        },
        select: {
          id: true,
          sectionId: true,
          versionNumber: true,
          publishedAt: true
        }
      });

      return {
        publishedVersion,
        archivedVersionIds: currentlyPublished.map((version) => version.id)
      };
    });

    return {
      sectionId: result.publishedVersion.sectionId,
      versionId: result.publishedVersion.id,
      versionNumber: result.publishedVersion.versionNumber,
      status: 'published',
      publishedAt: result.publishedVersion.publishedAt ?? publishedAt,
      archivedVersionIds: result.archivedVersionIds
    };
  }

  private validateBundlePath(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException('bundle_path is required');
    }

    return path.resolve(value.trim());
  }

  private validateMode(value: unknown): 'dryRun' | 'apply' {
    if (value !== 'dryRun' && value !== 'apply') {
      throw new BadRequestException('mode must be "dryRun" or "apply"');
    }

    return value;
  }

  private assertWithinConfiguredImportRoot(bundlePath: string): void {
    const configuredRoot = process.env.CONTENT_IMPORT_ROOT?.trim();
    if (!configuredRoot) {
      return;
    }

    const resolvedRoot = path.resolve(configuredRoot);
    const relative = path.relative(resolvedRoot, bundlePath);
    const isOutside =
      relative === '' ? false : relative.startsWith('..') || path.isAbsolute(relative);

    if (isOutside) {
      throw new BadRequestException('bundle_path is outside CONTENT_IMPORT_ROOT');
    }
  }

  private isPathAccessError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const code = (error as { code?: unknown }).code;
    return code === 'ENOENT' || code === 'ENOTDIR' || code === 'EACCES' || code === 'EPERM';
  }

  private async assertSectionExists(sectionId: string): Promise<void> {
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true }
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }
  }

  private async getSectionVersionOrThrow(sectionId: string, versionId: string) {
    const version = await this.prisma.sectionVersion.findFirst({
      where: {
        id: versionId,
        sectionId
      },
      select: {
        id: true,
        sectionId: true,
        versionNumber: true,
        status: true,
        changeLog: true,
        createdBy: true,
        createdAt: true,
        publishedAt: true,
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

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found for section ${sectionId}`);
    }

    return version;
  }

  private toSectionVersionSummaryDto(version: {
    id: string;
    sectionId: string;
    versionNumber: number;
    status: SectionVersionStatus;
    changeLog: string | null;
    createdBy: string | null;
    createdAt: Date;
    publishedAt: Date | null;
    _count: { lessonBlocks: number };
  }): SectionVersionSummaryDto {
    return {
      id: version.id,
      sectionId: version.sectionId,
      versionNumber: version.versionNumber,
      status: version.status,
      changeLog: version.changeLog,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      publishedAt: version.publishedAt,
      blockCount: version._count.lessonBlocks
    };
  }

  private toSectionVersionDetailDto(version: {
    id: string;
    sectionId: string;
    versionNumber: number;
    status: SectionVersionStatus;
    changeLog: string | null;
    createdBy: string | null;
    createdAt: Date;
    publishedAt: Date | null;
    lessonBlocks: Array<{
      id: string;
      blockOrder: number;
      blockType: import('@prisma/client').LessonBlockType;
      contentJson: unknown;
      estimatedSeconds: number | null;
    }>;
  }): SectionVersionDetailDto {
    return {
      id: version.id,
      sectionId: version.sectionId,
      versionNumber: version.versionNumber,
      status: version.status,
      changeLog: version.changeLog,
      createdBy: version.createdBy,
      createdAt: version.createdAt,
      publishedAt: version.publishedAt,
      lessonBlocks: version.lessonBlocks
    };
  }
}
