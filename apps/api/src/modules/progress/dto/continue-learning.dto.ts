export interface ContinueLearningDto {
  source: 'resume' | 'fallback';
  sectionId: string;
  moduleId: string;
  pathId: string;
  sectionTitle: string;
  moduleTitle: string;
  pathTitle: string;
  lastSeenAt: string | null;
}
