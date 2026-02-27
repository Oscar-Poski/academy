import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithAuth = vi.fn();
class MockAuthenticatedApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

vi.mock('@/src/lib/api-clients/authenticated-fetch.server', () => ({
  fetchWithAuth,
  AuthenticatedApiError: MockAuthenticatedApiError
}));

describe('unlocks route handlers', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('POST /api/unlocks/modules/:id/evaluate forwards and returns upstream payload/status', async () => {
    fetchWithAuth.mockResolvedValue(
      new Response(
        JSON.stringify({
          moduleId: 'module-1',
          isUnlocked: true,
          reasons: [],
          requiresCredits: false,
          creditsCost: 0
        }),
        { status: 200 }
      )
    );

    const { POST } = await import('@/app/api/unlocks/modules/[moduleId]/evaluate/route');

    const response = await POST(new Request('http://localhost/api/unlocks/modules/module-1/evaluate'), {
      params: { moduleId: 'module-1' }
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/v1/unlocks/modules/module-1/evaluate', {
      method: 'POST'
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      moduleId: 'module-1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: false,
      creditsCost: 0
    });
  });

  it('returns unauthorized shape on auth/session failure', async () => {
    fetchWithAuth.mockRejectedValue(new MockAuthenticatedApiError('unauthorized', 401));

    const { POST } = await import('@/app/api/unlocks/modules/[moduleId]/evaluate/route');

    const response = await POST(new Request('http://localhost/api/unlocks/modules/module-1/evaluate'), {
      params: { moduleId: 'module-1' }
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });
});
