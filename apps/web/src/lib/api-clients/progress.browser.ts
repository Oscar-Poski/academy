import type {
  CompletionBlockedError,
  SectionProgress,
  UpdateSectionPositionRequest
} from '@/src/lib/progress-types';

export class BrowserProgressApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
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

  const payload = (await response.json().catch(() => null)) as T | unknown;

  if (!response.ok) {
    throw new BrowserProgressApiError(`Progress request failed for ${path}`, response.status, payload);
  }

  return payload as T;
}

export function completeSectionProgress(sectionId: string): Promise<SectionProgress> {
  return fetchProgressJson<SectionProgress>(`/api/progress/sections/${sectionId}/complete`, {
    method: 'POST'
  });
}

export function isCompletionBlockedError(error: unknown): error is BrowserProgressApiError & {
  payload: CompletionBlockedError;
} {
  if (!(error instanceof BrowserProgressApiError)) {
    return false;
  }

  if (error.status !== 409 || !error.payload || typeof error.payload !== 'object') {
    return false;
  }

  const payload = error.payload as Partial<CompletionBlockedError>;
  return (
    payload.code === 'completion_blocked' &&
    Array.isArray(payload.reasons) &&
    typeof payload.requiresQuizPass === 'boolean' &&
    typeof payload.requiresUnlock === 'boolean'
  );
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
