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

describe('progress route handlers', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('POST /api/progress/sections/:id/complete passes through 409 completion_blocked payload', async () => {
    fetchWithAuth.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'completion_blocked',
          reasons: ['Pass quiz first'],
          requiresQuizPass: true,
          requiresUnlock: false
        }),
        { status: 409 }
      )
    );

    const { POST } = await import('@/app/api/progress/sections/[sectionId]/complete/route');

    const response = await POST(new Request('http://localhost/api/progress/sections/section-1/complete'), {
      params: { sectionId: 'section-1' }
    });

    expect(fetchWithAuth).toHaveBeenCalledWith('/v1/progress/sections/section-1/complete', {
      method: 'POST'
    });
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'completion_blocked',
      reasons: ['Pass quiz first'],
      requiresQuizPass: true,
      requiresUnlock: false
    });
  });

  it('returns unauthorized shape only for auth/session failure', async () => {
    fetchWithAuth.mockRejectedValue(new MockAuthenticatedApiError('unauthorized', 401));

    const { POST } = await import('@/app/api/progress/sections/[sectionId]/complete/route');

    const response = await POST(new Request('http://localhost/api/progress/sections/section-1/complete'), {
      params: { sectionId: 'section-1' }
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });
});
