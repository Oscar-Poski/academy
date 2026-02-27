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

describe('quiz route handlers', () => {
  beforeEach(() => {
    fetchWithAuth.mockReset();
  });

  it('POST /api/quizzes/sections/:id/attempts forwards payload and returns upstream response', async () => {
    fetchWithAuth.mockResolvedValue(
      new Response(JSON.stringify({ attemptId: 'attempt-1' }), { status: 201 })
    );

    const { POST } = await import('@/app/api/quizzes/sections/[sectionId]/attempts/route');

    const response = await POST(
      new Request('http://localhost/api/quizzes/sections/section-1/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: [{ question_id: 'q1', selected_option: 'GET' }] })
      }),
      { params: { sectionId: 'section-1' } }
    );

    expect(fetchWithAuth).toHaveBeenCalledWith('/v1/quizzes/sections/section-1/attempts', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ answers: [{ question_id: 'q1', selected_option: 'GET' }] })
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ attemptId: 'attempt-1' });
  });

  it('returns unauthorized shape when auth forwarding throws', async () => {
    fetchWithAuth.mockRejectedValue(new MockAuthenticatedApiError('unauthorized', 401));

    const { POST } = await import('@/app/api/quizzes/sections/[sectionId]/attempts/route');

    const response = await POST(
      new Request('http://localhost/api/quizzes/sections/section-1/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers: [] })
      }),
      { params: { sectionId: 'section-1' } }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'unauthorized',
      message: 'Invalid or missing bearer token'
    });
  });

  it('returns 400 for invalid payload', async () => {
    const { POST } = await import('@/app/api/quizzes/sections/[sectionId]/attempts/route');

    const response = await POST(
      new Request('http://localhost/api/quizzes/sections/section-1/attempts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ not_answers: [] })
      }),
      { params: { sectionId: 'section-1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'invalid_request',
      message: 'Invalid quiz submission payload'
    });
  });
});
