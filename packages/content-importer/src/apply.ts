import { LessonBlockType, PrismaClient, SectionVersionStatus } from '@prisma/client';
import { parseContentBundle } from './importer';
import { withPrisma } from './prisma';
import type {
  ContentImportApplyReport,
  ImportApplyEntityCounts,
  ImportApplySkip,
  ImportParseReport,
  NormalizedLessonBlockDraft
} from './types';

export type ApplyParsedContentOptions = {
  prisma?: PrismaClient;
};

export type ApplyContentBundleOptions = ApplyParsedContentOptions;

export async function applyContentBundle(
  rootPath: string,
  options: ApplyContentBundleOptions = {}
): Promise<ContentImportApplyReport> {
  const parseReport = await parseContentBundle(rootPath);
  return applyParsedContentReport(parseReport, options);
}

export async function applyParsedContentReport(
  parseReport: ImportParseReport,
  options: ApplyParsedContentOptions = {}
): Promise<ContentImportApplyReport> {
  if (parseReport.errorCount > 0) {
    return {
      mode: 'apply',
      parseReport,
      applied: false,
      abortedReason: 'parse_errors',
      counts: createEmptyCounts(),
      skips: []
    };
  }

  if (options.prisma) {
    return applyWithPrisma(parseReport, options.prisma);
  }

  return withPrisma((prisma) => applyWithPrisma(parseReport, prisma));
}

export function createDryRunApplyReport(parseReport: ImportParseReport): ContentImportApplyReport {
  return {
    mode: 'dry_run',
    parseReport,
    applied: false,
    abortedReason: null,
    counts: createEmptyCounts(),
    skips: []
  };
}

function createEmptyCounts(): ImportApplyEntityCounts {
  return {
    pathsCreated: 0,
    pathsUpdated: 0,
    modulesCreated: 0,
    modulesUpdated: 0,
    sectionsCreated: 0,
    sectionsUpdated: 0,
    sectionVersionsCreated: 0,
    sectionVersionsUpdated: 0,
    lessonBlocksReplaced: 0,
    sectionVersionsSkippedNonDraft: 0
  };
}

async function applyWithPrisma(
  parseReport: ImportParseReport,
  prisma: PrismaClient
): Promise<ContentImportApplyReport> {
  const counts = createEmptyCounts();
  const skips: ImportApplySkip[] = [];

  const pathIdBySlug = new Map<string, string>();
  const moduleIdBySlug = new Map<string, string>();
  const sectionIdBySlug = new Map<string, string>();

  for (const pathDraft of parseReport.paths) {
    const existing = await prisma.path.findUnique({
      where: { slug: pathDraft.slug },
      select: { id: true }
    });

    const result = await prisma.path.upsert({
      where: { slug: pathDraft.slug },
      update: {
        title: pathDraft.title,
        description: pathDraft.description,
        sortOrder: pathDraft.sortOrder
      },
      create: {
        slug: pathDraft.slug,
        title: pathDraft.title,
        description: pathDraft.description,
        sortOrder: pathDraft.sortOrder,
        status: 'draft'
      },
      select: { id: true }
    });

    pathIdBySlug.set(pathDraft.slug, result.id);
    if (existing) {
      counts.pathsUpdated += 1;
    } else {
      counts.pathsCreated += 1;
    }
  }

  for (const moduleDraft of parseReport.modules) {
    const pathId = pathIdBySlug.get(moduleDraft.pathSlug);
    if (!pathId) {
      throw new Error(`Resolved path slug missing during apply: ${moduleDraft.pathSlug}`);
    }

    const existing = await prisma.module.findUnique({
      where: { slug: moduleDraft.slug },
      select: { id: true }
    });

    const result = await prisma.module.upsert({
      where: { slug: moduleDraft.slug },
      update: {
        pathId,
        title: moduleDraft.title,
        description: moduleDraft.description,
        sortOrder: moduleDraft.sortOrder
      },
      create: {
        pathId,
        slug: moduleDraft.slug,
        title: moduleDraft.title,
        description: moduleDraft.description,
        sortOrder: moduleDraft.sortOrder,
        status: 'draft'
      },
      select: { id: true }
    });

    moduleIdBySlug.set(moduleDraft.slug, result.id);
    if (existing) {
      counts.modulesUpdated += 1;
    } else {
      counts.modulesCreated += 1;
    }
  }

  for (const sectionDraft of parseReport.sections) {
    const moduleId = moduleIdBySlug.get(sectionDraft.moduleSlug);
    if (!moduleId) {
      throw new Error(`Resolved module slug missing during apply: ${sectionDraft.moduleSlug}`);
    }

    const existing = await prisma.section.findUnique({
      where: { slug: sectionDraft.slug },
      select: { id: true }
    });

    const result = await prisma.section.upsert({
      where: { slug: sectionDraft.slug },
      update: {
        moduleId,
        title: sectionDraft.title,
        sortOrder: sectionDraft.sortOrder,
        hasQuiz: sectionDraft.hasQuiz
      },
      create: {
        moduleId,
        slug: sectionDraft.slug,
        title: sectionDraft.title,
        sortOrder: sectionDraft.sortOrder,
        hasQuiz: sectionDraft.hasQuiz
      },
      select: { id: true }
    });

    sectionIdBySlug.set(sectionDraft.slug, result.id);
    if (existing) {
      counts.sectionsUpdated += 1;
    } else {
      counts.sectionsCreated += 1;
    }
  }

  for (const versionDraft of parseReport.sectionVersions) {
    const sectionId = sectionIdBySlug.get(versionDraft.sectionSlug);
    if (!sectionId) {
      throw new Error(`Resolved section slug missing during apply: ${versionDraft.sectionSlug}`);
    }

    const existing = await prisma.sectionVersion.findUnique({
      where: {
        sectionId_versionNumber: {
          sectionId,
          versionNumber: versionDraft.versionNumber
        }
      },
      select: {
        id: true,
        status: true
      }
    });

    if (existing && existing.status !== SectionVersionStatus.draft) {
      counts.sectionVersionsSkippedNonDraft += 1;
      skips.push({
        code: 'section_version_not_draft',
        message: `Skipping non-draft section version (${existing.status})`,
        sectionSlug: versionDraft.sectionSlug,
        versionNumber: versionDraft.versionNumber,
        sourcePath: versionDraft.sourcePath
      });
      continue;
    }

    let sectionVersionId: string;

    if (!existing) {
      const created = await prisma.sectionVersion.create({
        data: {
          sectionId,
          versionNumber: versionDraft.versionNumber,
          status: SectionVersionStatus.draft,
          changeLog: versionDraft.changeLog,
          createdBy: versionDraft.createdBy,
          publishedAt: null
        },
        select: { id: true }
      });
      sectionVersionId = created.id;
      counts.sectionVersionsCreated += 1;
    } else {
      const updated = await prisma.sectionVersion.update({
        where: { id: existing.id },
        data: {
          status: SectionVersionStatus.draft,
          changeLog: versionDraft.changeLog,
          createdBy: versionDraft.createdBy,
          publishedAt: null
        },
        select: { id: true }
      });
      sectionVersionId = updated.id;
      counts.sectionVersionsUpdated += 1;
    }

    await replaceLessonBlocks(prisma, sectionVersionId, versionDraft.blocks);
    counts.lessonBlocksReplaced += versionDraft.blocks.length;
  }

  return {
    mode: 'apply',
    parseReport,
    applied: true,
    abortedReason: null,
    counts,
    skips
  };
}

async function replaceLessonBlocks(
  prisma: PrismaClient,
  sectionVersionId: string,
  blocks: NormalizedLessonBlockDraft[]
) {
  await prisma.$transaction(async (tx) => {
    await tx.lessonBlock.deleteMany({
      where: { sectionVersionId }
    });

    if (blocks.length === 0) {
      return;
    }

    await tx.lessonBlock.createMany({
      data: blocks.map((block) => ({
        sectionVersionId,
        blockOrder: block.blockOrder,
        blockType: toLessonBlockType(block.blockType),
        contentJson: block.contentJson,
        estimatedSeconds: block.estimatedSeconds
      }))
    });
  });
}

function toLessonBlockType(blockType: NormalizedLessonBlockDraft['blockType']): LessonBlockType {
  switch (blockType) {
    case 'markdown':
      return LessonBlockType.markdown;
    default:
      throw new Error(`Unsupported lesson block type: ${String(blockType)}`);
  }
}

