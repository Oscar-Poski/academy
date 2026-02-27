import type {
  ContinueLearning,
  ModuleProgress,
  PathProgress,
  SectionProgress,
  UpdateSectionPositionRequest
} from '@/src/lib/progress-types';
import { fetchJsonWithAuth } from './authenticated-fetch.server';

export function startSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchJsonWithAuth<SectionProgress>(`/v1/progress/sections/${sectionId}/start`, {
    method: 'POST'
  });
}

export function completeSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchJsonWithAuth<SectionProgress>(`/v1/progress/sections/${sectionId}/complete`, {
    method: 'POST'
  });
}

export function getSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchJsonWithAuth<SectionProgress>(`/v1/progress/sections/${sectionId}`);
}

export function updateSectionPosition(
  sectionId: string,
  body: UpdateSectionPositionRequest
): Promise<SectionProgress> {
  return fetchJsonWithAuth<SectionProgress>(`/v1/progress/sections/${sectionId}/position`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}

export function getModuleProgress(moduleId: string): Promise<ModuleProgress> {
  return fetchJsonWithAuth<ModuleProgress>(`/v1/progress/modules/${moduleId}`);
}

export function getPathProgress(pathId: string): Promise<PathProgress> {
  return fetchJsonWithAuth<PathProgress>(`/v1/progress/paths/${pathId}`);
}

export function getContinueLearning(): Promise<ContinueLearning> {
  return fetchJsonWithAuth<ContinueLearning>('/v1/progress/continue');
}
