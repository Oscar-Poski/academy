import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchWithAuth = vi.fn();
const fetchJsonWithAuth = vi.fn();
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
  fetchJsonWithAuth,
  AuthenticatedApiError: MockAuthenticatedApiError
}));

describe('progress route handlers', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
    fetchJsonWithAuth.mockReset();
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

  it('PATCH /api/progress/sections/:id/position returns unauthorized only for auth/session failure', async () => {
    fetchJsonWithAuth.mockRejectedValue(new MockAuthenticatedApiError('unauthorized', 401));

    const { PATCH } = await import('@/app/api/progress/sections/[sectionId]/position/route');

    const response = await PATCH(
      new Request('http://localhost/api/progress/sections/section-1/position', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          last_block_order: 2,
          time_spent_delta: 10
        })
      }),
      { params: { sectionId: 'section-1' } }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });

  it('PATCH /api/progress/sections/:id/position returns internal_error on unexpected failure', async () => {
    fetchJsonWithAuth.mockRejectedValue(new Error('boom'));

    const { PATCH } = await import('@/app/api/progress/sections/[sectionId]/position/route');

    const response = await PATCH(
      new Request('http://localhost/api/progress/sections/section-1/position', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          last_block_order: 3,
          time_spent_delta: 15
        })
      }),
      { params: { sectionId: 'section-1' } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      code: 'internal_error',
      message: 'Unexpected server error'
    });
  });
});
