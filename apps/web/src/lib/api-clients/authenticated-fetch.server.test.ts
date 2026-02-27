import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieStore = {
  values: new Map<string, string>(),
  set: vi.fn((name: string, value: string) => {
    cookieStore.values.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    cookieStore.values.delete(name);
  }),
  get: vi.fn((name: string) => {
    const value = cookieStore.values.get(name);
    return value ? { value } : undefined;
  })
};

vi.mock('next/headers', () => ({
  cookies: () => cookieStore
}));

describe('authenticated-fetch.server', () => {
  beforeEach(() => {
    cookieStore.values.clear();
    cookieStore.set.mockClear();
    cookieStore.delete.mockClear();
    cookieStore.get.mockClear();
    vi.restoreAllMocks();
  });

  it('sends bearer token when session exists', async () => {
    cookieStore.values.set('academy_access_token', 'access-1');
    cookieStore.values.set('academy_refresh_token', 'refresh-1');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    const { fetchJsonWithAuth } = await import('./authenticated-fetch.server');

    const payload = await fetchJsonWithAuth<{ ok: boolean }>('/v1/progress/continue');
    expect(payload).toEqual({ ok: true });

    const [, init] = fetchSpy.mock.calls[0];
    const headers = init?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-1');
  });

  it('refreshes once after 401 and retries with new token', async () => {
    cookieStore.values.set('academy_access_token', 'access-1');
    cookieStore.values.set('academy_refresh_token', 'refresh-1');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: 'access-2',
            token_type: 'Bearer',
            expires_in: 900,
            refresh_token: 'refresh-2',
            refresh_expires_in: 604800
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const { fetchJsonWithAuth } = await import('./authenticated-fetch.server');

    const payload = await fetchJsonWithAuth<{ ok: boolean }>('/v1/progress/continue');
    expect(payload).toEqual({ ok: true });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const [, retryInit] = fetchSpy.mock.calls[2];
    const retryHeaders = retryInit?.headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer access-2');
    expect(cookieStore.set).toHaveBeenCalled();
  });

  it('clears session when refresh fails', async () => {
    cookieStore.values.set('academy_access_token', 'access-1');
    cookieStore.values.set('academy_refresh_token', 'refresh-1');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'unauthorized',
            message: 'Invalid refresh token'
          }),
          { status: 401 }
        )
      );

    const { fetchJsonWithAuth } = await import('./authenticated-fetch.server');

    await expect(fetchJsonWithAuth('/v1/progress/continue')).rejects.toThrow('Unauthenticated');
    expect(cookieStore.delete).toHaveBeenCalledWith('academy_access_token');
    expect(cookieStore.delete).toHaveBeenCalledWith('academy_refresh_token');
  });
});
