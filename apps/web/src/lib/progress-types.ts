export type SectionProgressStatus = 'not_started' | 'in_progress' | 'completed';

export type SectionProgress = {
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
};

export type ContinueLearning = {
  source: 'resume' | 'fallback';
  sectionId: string;
  moduleId: string;
  pathId: string;
  sectionTitle: string;
  moduleTitle: string;
  pathTitle: string;
  lastSeenAt: string | null;
};
