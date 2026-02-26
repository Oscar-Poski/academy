import { LessonBlockType, SectionVersionStatus } from '@prisma/client';

export interface AdminSectionLessonBlockDto {
  id: string;
  blockOrder: number;
  blockType: LessonBlockType;
  contentJson: unknown;
  estimatedSeconds: number | null;
}

export interface SectionVersionDetailDto {
  id: string;
  sectionId: string;
  versionNumber: number;
  status: SectionVersionStatus;
  changeLog: string | null;
  createdBy: string | null;
  createdAt: Date;
  publishedAt: Date | null;
  lessonBlocks: AdminSectionLessonBlockDto[];
}

