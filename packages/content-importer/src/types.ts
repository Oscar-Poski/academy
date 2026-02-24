export type ImportValidationLevel = 'error' | 'warning';

export type ImportValidationMessage = {
  level: ImportValidationLevel;
  code: string;
  message: string;
  sourcePath: string | null;
};

export type NormalizedPathDraft = {
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
};

export type NormalizedModuleDraft = {
  slug: string;
  pathSlug: string;
  title: string;
  description: string | null;
  sortOrder: number;
};

export type NormalizedSectionDraft = {
  slug: string;
  moduleSlug: string;
  title: string;
  sortOrder: number;
  hasQuiz: boolean;
};

export type NormalizedLessonBlockDraft = {
  blockOrder: number;
  blockType: 'markdown';
  contentJson: { markdown: string };
  estimatedSeconds: number | null;
};

export type NormalizedSectionVersionDraft = {
  sectionSlug: string;
  versionNumber: number;
  status: 'draft';
  changeLog: string | null;
  createdBy: string | null;
  sourcePath: string;
  blocks: NormalizedLessonBlockDraft[];
};

export type ImportParseReport = {
  rootPath: string;
  scannedFileCount: number;
  parsedFileCount: number;
  errorCount: number;
  warningCount: number;
  paths: NormalizedPathDraft[];
  modules: NormalizedModuleDraft[];
  sections: NormalizedSectionDraft[];
  sectionVersions: NormalizedSectionVersionDraft[];
  messages: ImportValidationMessage[];
};

export type ParsedFrontmatterDocument = {
  path: NormalizedPathDraft;
  module: NormalizedModuleDraft;
  section: NormalizedSectionDraft;
  sectionVersion: Omit<NormalizedSectionVersionDraft, 'blocks' | 'sourcePath'>;
  estimatedSeconds: number | null;
  ignoredStatusProvided: boolean;
};

