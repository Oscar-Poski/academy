export type PathListItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  moduleCount: number;
  sectionCount: number;
};

export type PathTreeSection = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
};

export type PathTreeModule = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
  sections: PathTreeSection[];
};

export type PathTree = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  modules: PathTreeModule[];
};

export type ModuleDetailSection = {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
};

export type ModuleDetail = {
  id: string;
  pathId: string;
  slug: string;
  title: string;
  description: string | null;
  sortOrder: number;
  sections: ModuleDetailSection[];
};

export type LessonBlockType = 'markdown' | 'callout' | 'code' | 'quiz' | 'checklist';

export type SectionLessonBlock = {
  id: string;
  blockOrder: number;
  blockType: LessonBlockType;
  contentJson: unknown;
  estimatedSeconds: number | null;
};

export type SectionNavigation = {
  prevSectionId: string | null;
  nextSectionId: string | null;
};

export type SectionDetail = {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  sortOrder: number;
  sectionVersionId: string;
  lessonBlocks: SectionLessonBlock[];
  navigation: SectionNavigation;
};
