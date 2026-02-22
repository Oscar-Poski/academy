import type {
  ContinueLearning,
  ModuleProgress,
  PathProgress,
  SectionProgress
} from '@/src/lib/progress-types';
import { getTempUserId } from '@/src/lib/temp-user';
import { ContentApiError } from './content.client';

const PROGRESS_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : 'http://localhost:3001';

async function fetchProgressJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('x-user-id', getTempUserId());
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(`${PROGRESS_API_BASE_URL}${path}`, {
    cache: 'no-store',
    ...init,
    headers
  });

  if (!response.ok) {
    throw new ContentApiError(`Progress API request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export function startSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchProgressJson<SectionProgress>(`/v1/progress/sections/${sectionId}/start`, {
    method: 'POST'
  });
}

export function getSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchProgressJson<SectionProgress>(`/v1/progress/sections/${sectionId}`);
}

export function getModuleProgress(moduleId: string): Promise<ModuleProgress> {
  return fetchProgressJson<ModuleProgress>(`/v1/progress/modules/${moduleId}`);
}

export function getPathProgress(pathId: string): Promise<PathProgress> {
  return fetchProgressJson<PathProgress>(`/v1/progress/paths/${pathId}`);
}

export function getContinueLearning(): Promise<ContinueLearning> {
  return fetchProgressJson<ContinueLearning>('/v1/progress/continue');
}
