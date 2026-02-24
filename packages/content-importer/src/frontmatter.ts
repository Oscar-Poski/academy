import matter from 'gray-matter';
import { z } from 'zod';
import type { ParsedFrontmatterDocument } from './types';

const nullableStringField = z.union([z.string(), z.null()]).optional();

const frontmatterSchema = z.object({
  path_slug: z.string().min(1),
  path_title: z.string().min(1),
  path_description: nullableStringField,
  path_sort_order: z.number().int().optional(),
  module_slug: z.string().min(1),
  module_title: z.string().min(1),
  module_description: nullableStringField,
  module_sort_order: z.number().int().optional(),
  section_slug: z.string().min(1),
  section_title: z.string().min(1),
  section_sort_order: z.number().int().optional(),
  section_has_quiz: z.boolean().optional(),
  version_number: z.number().int().min(1),
  change_log: nullableStringField,
  created_by: nullableStringField,
  estimated_seconds: z.union([z.number().int().min(0), z.null()]).optional()
});

export type FrontmatterParseResult = {
  body: string;
  normalized: ParsedFrontmatterDocument;
};

export function parseFrontmatterDocument(rawSource: string): {
  body: string;
  data: Record<string, unknown>;
} {
  const parsed = matter(rawSource);
  const data =
    parsed.data && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
      ? (parsed.data as Record<string, unknown>)
      : {};

  return {
    body: parsed.content,
    data
  };
}

export function normalizeFrontmatter(data: Record<string, unknown>): ParsedFrontmatterDocument {
  const parsed = frontmatterSchema.parse(data);

  return {
    path: {
      slug: parsed.path_slug,
      title: parsed.path_title,
      description: parsed.path_description ?? null,
      sortOrder: parsed.path_sort_order ?? 0
    },
    module: {
      slug: parsed.module_slug,
      pathSlug: parsed.path_slug,
      title: parsed.module_title,
      description: parsed.module_description ?? null,
      sortOrder: parsed.module_sort_order ?? 0
    },
    section: {
      slug: parsed.section_slug,
      moduleSlug: parsed.module_slug,
      title: parsed.section_title,
      sortOrder: parsed.section_sort_order ?? 0,
      hasQuiz: parsed.section_has_quiz ?? false
    },
    sectionVersion: {
      sectionSlug: parsed.section_slug,
      versionNumber: parsed.version_number,
      status: 'draft',
      changeLog: parsed.change_log ?? null,
      createdBy: parsed.created_by ?? null
    },
    estimatedSeconds: parsed.estimated_seconds ?? null,
    ignoredStatusProvided: Object.prototype.hasOwnProperty.call(data, 'status')
  };
}

