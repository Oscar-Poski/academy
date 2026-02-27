import type { SectionProgress, UpdateSectionPositionRequest } from '@/src/lib/progress-types';

class BrowserProgressApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'BrowserProgressApiError';
  }
}

async function fetchProgressJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(path, {
    cache: 'no-store',
    ...init,
    headers
  });

  if (!response.ok) {
    throw new BrowserProgressApiError(`Progress request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export function completeSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchProgressJson<SectionProgress>(`/api/progress/sections/${sectionId}/complete`, {
    method: 'POST'
  });
}

export function updateSectionPosition(
  sectionId: string,
  body: UpdateSectionPositionRequest
): Promise<SectionProgress> {
  return fetchProgressJson<SectionProgress>(`/api/progress/sections/${sectionId}/position`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
}
