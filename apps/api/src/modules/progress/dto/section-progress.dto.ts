export type SectionProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface SectionProgressDto {
  id: string;
  userId: string;
  sectionId: string;
  sectionVersionId: string;
  status: SectionProgressStatus;
  startedAt: string | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  completionPct: number;
  lastBlockOrder: number | null;
  timeSpentSeconds: number;
}
