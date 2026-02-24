import path from 'node:path';
import { ZodError } from 'zod';
import { listMarkdownFiles, readUtf8File } from './fs';
import { normalizeFrontmatter, parseFrontmatterDocument } from './frontmatter';
import type {
  ImportParseReport,
  ImportValidationMessage,
  NormalizedModuleDraft,
  NormalizedPathDraft,
  NormalizedSectionDraft,
  NormalizedSectionVersionDraft
} from './types';
import { createMessage, jsonStableString, sortMessages } from './validation';

type ParsedFileDocument = {
  sourcePath: string;
  path: NormalizedPathDraft;
  module: NormalizedModuleDraft;
  section: NormalizedSectionDraft;
  sectionVersion: NormalizedSectionVersionDraft;
};

export async function parseContentBundle(rootPath: string): Promise<ImportParseReport> {
  const resolvedRootPath = path.resolve(rootPath);
  const filePaths = await listMarkdownFiles(resolvedRootPath);
  const messages: ImportValidationMessage[] = [];
  const parsedDocuments: ParsedFileDocument[] = [];

  for (const filePath of filePaths) {
    const parseResult = await parseFileToDocument(filePath, messages);
    if (parseResult) {
      parsedDocuments.push(parseResult);
    }
  }

  const pathMap = new Map<string, NormalizedPathDraft>();
  const moduleMap = new Map<string, NormalizedModuleDraft>();
  const sectionMap = new Map<string, NormalizedSectionDraft>();
  const sectionVersionMap = new Map<string, NormalizedSectionVersionDraft>();

  for (const document of parsedDocuments) {
    upsertByKey({
      map: pathMap,
      key: document.path.slug,
      candidate: document.path,
      label: 'path',
      sourcePath: document.sourcePath,
      messages
    });

    upsertByKey({
      map: moduleMap,
      key: document.module.slug,
      candidate: document.module,
      label: 'module',
      sourcePath: document.sourcePath,
      messages
    });

    upsertByKey({
      map: sectionMap,
      key: document.section.slug,
      candidate: document.section,
      label: 'section',
      sourcePath: document.sourcePath,
      messages
    });

    const sectionVersionKey = `${document.sectionVersion.sectionSlug}:${document.sectionVersion.versionNumber}`;
    if (sectionVersionMap.has(sectionVersionKey)) {
      messages.push(
        createMessage(
          'error',
          'duplicate_section_version',
          `Duplicate section version key "${sectionVersionKey}" encountered; keeping first file.`,
          document.sourcePath
        )
      );
    } else {
      sectionVersionMap.set(sectionVersionKey, document.sectionVersion);
    }
  }

  const sortedMessages = sortMessages(messages);
  const errorCount = sortedMessages.filter((message) => message.level === 'error').length;
  const warningCount = sortedMessages.filter((message) => message.level === 'warning').length;

  return {
    rootPath: resolvedRootPath,
    scannedFileCount: filePaths.length,
    parsedFileCount: parsedDocuments.length,
    errorCount,
    warningCount,
    paths: [...pathMap.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    modules: [...moduleMap.values()].sort((a, b) =>
      a.pathSlug === b.pathSlug ? a.slug.localeCompare(b.slug) : a.pathSlug.localeCompare(b.pathSlug)
    ),
    sections: [...sectionMap.values()].sort((a, b) =>
      a.moduleSlug === b.moduleSlug ? a.slug.localeCompare(b.slug) : a.moduleSlug.localeCompare(b.moduleSlug)
    ),
    sectionVersions: [...sectionVersionMap.values()].sort((a, b) =>
      a.sectionSlug === b.sectionSlug
        ? a.versionNumber - b.versionNumber
        : a.sectionSlug.localeCompare(b.sectionSlug)
    ),
    messages: sortedMessages
  };
}

async function parseFileToDocument(
  filePath: string,
  messages: ImportValidationMessage[]
): Promise<ParsedFileDocument | null> {
  let rawSource: string;

  try {
    rawSource = await readUtf8File(filePath);
  } catch (error) {
    messages.push(
      createMessage('error', 'read_failed', `Failed to read file: ${getErrorMessage(error)}`, filePath)
    );
    return null;
  }

  let frontmatterBody: string;
  let frontmatterData: Record<string, unknown>;
  try {
    const parsed = parseFrontmatterDocument(rawSource);
    frontmatterBody = parsed.body;
    frontmatterData = parsed.data;
  } catch (error) {
    messages.push(
      createMessage(
        'error',
        'frontmatter_parse_failed',
        `Failed to parse frontmatter: ${getErrorMessage(error)}`,
        filePath
      )
    );
    return null;
  }

  let normalized;
  try {
    normalized = normalizeFrontmatter(frontmatterData);
  } catch (error) {
    if (error instanceof ZodError) {
      for (const issue of error.issues) {
        const issuePath = issue.path.length > 0 ? issue.path.join('.') : 'frontmatter';
        messages.push(
          createMessage(
            'error',
            'invalid_frontmatter',
            `Invalid frontmatter field "${issuePath}": ${issue.message}`,
            filePath
          )
        );
      }
      return null;
    }

    messages.push(
      createMessage(
        'error',
        'frontmatter_normalize_failed',
        `Failed to normalize frontmatter: ${getErrorMessage(error)}`,
        filePath
      )
    );
    return null;
  }

  if (normalized.ignoredStatusProvided) {
    messages.push(
      createMessage('warning', 'ignored_status', 'Frontmatter field "status" is ignored; draft is enforced.', filePath)
    );
  }

  const markdown = frontmatterBody.trim();
  if (markdown.length === 0) {
    messages.push(createMessage('warning', 'empty_markdown_body', 'Markdown body is empty.', filePath));
  }

  return {
    sourcePath: filePath,
    path: normalized.path,
    module: normalized.module,
    section: normalized.section,
    sectionVersion: {
      ...normalized.sectionVersion,
      sourcePath: filePath,
      blocks: [
        {
          blockOrder: 1,
          blockType: 'markdown',
          contentJson: { markdown },
          estimatedSeconds: normalized.estimatedSeconds
        }
      ]
    }
  };
}

function upsertByKey<T extends object>(params: {
  map: Map<string, T>;
  key: string;
  candidate: T;
  label: string;
  sourcePath: string;
  messages: ImportValidationMessage[];
}) {
  const existing = params.map.get(params.key);
  if (!existing) {
    params.map.set(params.key, params.candidate);
    return;
  }

  if (jsonStableString(existing) !== jsonStableString(params.candidate)) {
    params.messages.push(
      createMessage(
        'error',
        `conflicting_${params.label}`,
        `Conflicting ${params.label} metadata for key "${params.key}"; keeping first occurrence.`,
        params.sourcePath
      )
    );
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

