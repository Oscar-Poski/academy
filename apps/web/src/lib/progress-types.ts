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

export type UpdateSectionPositionRequest = {
  last_block_order: number;
  time_spent_delta: number;
  completion_pct?: number;
};

export type CompletionBlockedError = {
  code: 'completion_blocked';
  reasons: string[];
  requiresQuizPass: boolean;
  requiresUnlock: boolean;
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

export type ModuleSectionProgressItem = {
  sectionId: string;
  status: SectionProgressStatus;
  completionPct: number;
  lastBlockOrder: number | null;
  lastSeenAt: string | null;
  completedAt: string | null;
  sectionVersionId: string | null;
};

export type ModuleProgress = {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
  sections: ModuleSectionProgressItem[];
};

export type PathModuleProgressItem = {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
};

export type PathProgress = {
  pathId: string;
  completionPct: number;
  completedModules: number;
  totalModules: number;
  modules: PathModuleProgressItem[];
};
