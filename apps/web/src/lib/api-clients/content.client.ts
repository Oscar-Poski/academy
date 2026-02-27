import type { ModuleDetail, PathListItem, PathTree, SectionDetail } from '@/src/lib/content-types';
import {
  AuthenticatedApiError,
  fetchJsonWithAuth,
  fetchJsonWithOptionalAuth,
  fetchPublicJson
} from './authenticated-fetch.server';

export { AuthenticatedApiError as ContentApiError };

export function getPaths(): Promise<PathListItem[]> {
  return fetchPublicJson<PathListItem[]>('/v1/paths');
}

export function getPath(pathId: string, options?: { includeUserContext?: boolean }): Promise<PathTree> {
  if (!options?.includeUserContext) {
    return fetchPublicJson<PathTree>(`/v1/paths/${pathId}`);
  }

  return fetchJsonWithOptionalAuth<PathTree>(`/v1/paths/${pathId}`);
}

export function getModule(moduleId: string, options?: { includeUserContext?: boolean }): Promise<ModuleDetail> {
  if (!options?.includeUserContext) {
    return fetchPublicJson<ModuleDetail>(`/v1/modules/${moduleId}`);
  }

  return fetchJsonWithOptionalAuth<ModuleDetail>(`/v1/modules/${moduleId}`);
}

export function getSection(
  sectionId: string,
  options?: { includeUserContext?: boolean }
): Promise<SectionDetail> {
  if (!options?.includeUserContext) {
    return fetchPublicJson<SectionDetail>(`/v1/sections/${sectionId}`);
  }

  return fetchJsonWithAuth<SectionDetail>(`/v1/sections/${sectionId}`);
}
