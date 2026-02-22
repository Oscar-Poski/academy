import type { ModuleDetail, PathListItem, PathTree, SectionDetail } from '@/src/lib/content-types';

const CONTENT_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL && process.env.NEXT_PUBLIC_API_BASE_URL.trim().length > 0
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : 'http://localhost:3001';

export class ContentApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ContentApiError';
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${CONTENT_API_BASE_URL}${path}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new ContentApiError(`Content API request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export function getPaths(): Promise<PathListItem[]> {
  return fetchJson<PathListItem[]>('/v1/paths');
}

export function getPath(pathId: string): Promise<PathTree> {
  return fetchJson<PathTree>(`/v1/paths/${pathId}`);
}

export function getModule(moduleId: string): Promise<ModuleDetail> {
  return fetchJson<ModuleDetail>(`/v1/modules/${moduleId}`);
}

export function getSection(sectionId: string): Promise<SectionDetail> {
  return fetchJson<SectionDetail>(`/v1/sections/${sectionId}`);
}
