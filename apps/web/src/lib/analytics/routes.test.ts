import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

vi.mock('@/src/lib/auth/constants', () => ({
  getApiBaseUrl: () => 'http://localhost:3001'
}));

describe('analytics route handlers', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('POST /api/analytics/events forwards payload and returns upstream response', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: 'event-1' }), { status: 201 })
    );

    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(
      new Request('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event_name: 'player_exit',
          occurred_at: '2026-02-28T12:00:00.000Z'
        })
      })
    );

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/v1/analytics/events', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        event_name: 'player_exit',
        occurred_at: '2026-02-28T12:00:00.000Z'
      })
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'event-1' });
  });

  it('passes through upstream 400 payload', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'invalid_analytics_payload',
          message: 'Analytics payload failed validation',
          details: ['user_id is required']
        }),
        { status: 400 }
      )
    );

    const { POST } = await import('@/app/api/analytics/events/route');

    const response = await POST(
      new Request('http://localhost/api/analytics/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event_name: 'player_dropoff',
          occurred_at: '2026-02-28T12:00:00.000Z'
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'invalid_analytics_payload',
      message: 'Analytics payload failed validation',
      details: ['user_id is required']
    });
  });
});
