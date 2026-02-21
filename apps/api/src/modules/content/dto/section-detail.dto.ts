import { LessonBlockType } from '@prisma/client';

export interface SectionLessonBlockDto {
  id: string;
  blockOrder: number;
  blockType: LessonBlockType;
  contentJson: unknown;
  estimatedSeconds: number | null;
}

export interface SectionNavigationDto {
  prevSectionId: string | null;
  nextSectionId: string | null;
}

export interface SectionDetailDto {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  sortOrder: number;
  sectionVersionId: string;
  lessonBlocks: SectionLessonBlockDto[];
  navigation: SectionNavigationDto;
}
