import type { SectionProgressStatus } from './section-progress.dto';

export interface ModuleSectionProgressItemDto {
  sectionId: string;
  status: SectionProgressStatus;
  completionPct: number;
  lastBlockOrder: number | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  sectionVersionId: string | null;
}

export interface ModuleProgressDto {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
  sections: ModuleSectionProgressItemDto[];
}
