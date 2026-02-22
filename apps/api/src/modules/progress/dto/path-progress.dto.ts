export interface PathModuleProgressItemDto {
  moduleId: string;
  completionPct: number;
  completedSections: number;
  totalSections: number;
}

export interface PathProgressDto {
  pathId: string;
  completionPct: number;
  completedModules: number;
  totalModules: number;
  modules: PathModuleProgressItemDto[];
}
