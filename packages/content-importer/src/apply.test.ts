import { SectionVersionStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { applyParsedContentReport } from './apply';
import type { ImportParseReport } from './types';

function emptyParseReport(): ImportParseReport {
  return {
    rootPath: '/tmp/test-bundle',
    scannedFileCount: 0,
    parsedFileCount: 0,
    errorCount: 0,
    warningCount: 0,
    paths: [],
    modules: [],
    sections: [],
    sectionVersions: [],
    messages: []
  };
}

describe('applyParsedContentReport', () => {
  it('aborts without DB writes when parse errors are present', async () => {
    const parseReport: ImportParseReport = {
      ...emptyParseReport(),
      errorCount: 1
    };

    const result = await applyParsedContentReport(parseReport);

    expect(result.mode).toBe('apply');
    expect(result.applied).toBe(false);
    expect(result.abortedReason).toBe('parse_errors');
    expect(result.counts.sectionVersionsCreated).toBe(0);
    expect(result.skips).toHaveLength(0);
  });

  it('skips non-draft existing section versions and reports skip', async () => {
    const parseReport: ImportParseReport = {
      ...emptyParseReport(),
      scannedFileCount: 1,
      parsedFileCount: 1,
      paths: [
        {
          slug: 'web-pentest-path',
          title: 'Web Pentest Path',
          description: null,
          sortOrder: 1
        }
      ],
      modules: [
        {
          slug: 'http-basics-module',
          pathSlug: 'web-pentest-path',
          title: 'HTTP Basics',
          description: null,
          sortOrder: 1
        }
      ],
      sections: [
        {
          slug: 'request-response-cycle',
          moduleSlug: 'http-basics-module',
          title: 'Request/Response Cycle',
          sortOrder: 1,
          hasQuiz: true
        }
      ],
      sectionVersions: [
        {
          sectionSlug: 'request-response-cycle',
          versionNumber: 1,
          status: 'draft',
          changeLog: 'Should skip',
          createdBy: 'tester',
          sourcePath: '/tmp/test-bundle/request-response-cycle.v1.md',
          blocks: [
            {
              blockOrder: 1,
              blockType: 'markdown',
              contentJson: { markdown: '# Hello' },
              estimatedSeconds: 60
            }
          ]
        }
      ]
    };

    const prismaStub = {
      path: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'path_1' })
      },
      module: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'module_1' })
      },
      section: {
        findUnique: vi.fn().mockResolvedValue(null),
        upsert: vi.fn().mockResolvedValue({ id: 'section_1' })
      },
      sectionVersion: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'version_1',
          status: SectionVersionStatus.published
        }),
        create: vi.fn(),
        update: vi.fn()
      },
      lessonBlock: {
        deleteMany: vi.fn(),
        createMany: vi.fn()
      },
      $transaction: vi.fn()
    };

    const result = await applyParsedContentReport(parseReport, { prisma: prismaStub as never });

    expect(result.applied).toBe(true);
    expect(result.abortedReason).toBeNull();
    expect(result.counts.pathsCreated).toBe(1);
    expect(result.counts.modulesCreated).toBe(1);
    expect(result.counts.sectionsCreated).toBe(1);
    expect(result.counts.sectionVersionsSkippedNonDraft).toBe(1);
    expect(result.counts.sectionVersionsCreated).toBe(0);
    expect(result.counts.sectionVersionsUpdated).toBe(0);
    expect(result.counts.lessonBlocksReplaced).toBe(0);
    expect(result.skips).toHaveLength(1);
    expect(result.skips[0]).toMatchObject({
      code: 'section_version_not_draft',
      sectionSlug: 'request-response-cycle',
      versionNumber: 1
    });

    expect(prismaStub.sectionVersion.create).not.toHaveBeenCalled();
    expect(prismaStub.sectionVersion.update).not.toHaveBeenCalled();
    expect(prismaStub.$transaction).not.toHaveBeenCalled();
  });
});

