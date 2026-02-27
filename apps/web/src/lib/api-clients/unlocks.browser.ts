import type { UnlockDecision } from '@/src/lib/unlock-types';

export class BrowserUnlockApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload?: unknown
  ) {
    super(message);
    this.name = 'BrowserUnlockApiError';
  }
}

export async function evaluateModuleUnlock(moduleId: string): Promise<UnlockDecision> {
  const response = await fetch(`/api/unlocks/modules/${moduleId}/evaluate`, {
    method: 'POST',
    cache: 'no-store'
  });

  const payload = (await response.json().catch(() => null)) as UnlockDecision | unknown;

  if (!response.ok) {
    throw new BrowserUnlockApiError(
      `Unlock evaluate request failed for module ${moduleId}`,
      response.status,
      payload
    );
  }

  return payload as UnlockDecision;
}
