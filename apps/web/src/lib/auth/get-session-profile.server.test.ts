import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMe, apiRefresh, parseLoginResponse } = vi.hoisted(() => ({
  apiMe: vi.fn(),
  apiRefresh: vi.fn(),
  parseLoginResponse: vi.fn()
}));

vi.mock('next/headers', () => ({
  cookies: () => ({})
}));

vi.mock('./api', () => ({
  apiMe,
  apiRefresh,
  parseLoginResponse
}));

import {
  getSessionProfileMutableFromStore,
  getSessionProfileReadOnlyFromStore
} from './get-session-profile.server';

function createCookieStore(seed?: Record<string, string>) {
  const values = new Map<string, string>(Object.entries(seed ?? {}));
  const set = vi.fn((name: string, value: string) => {
    values.set(name, value);
  });
  const del = vi.fn((name: string) => {
    values.delete(name);
  });

  return {
    values,
    set,
    delete: del,
    get(name: string) {
      const value = values.get(name);
      return value ? { value } : undefined;
    }
  };
}

describe('getSessionProfileReadOnlyFromStore', () => {
  beforeEach(() => {
    apiMe.mockReset();
    apiRefresh.mockReset();
    parseLoginResponse.mockReset();
  });

  it('returns unauthenticated when session cookies are missing', async () => {
    const cookieStore = createCookieStore();

    await expect(getSessionProfileReadOnlyFromStore(cookieStore)).resolves.toEqual({
      authenticated: false
    });

    expect(apiMe).not.toHaveBeenCalled();
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('returns authenticated profile when access token is valid', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'access-1',
      academy_refresh_token: 'refresh-1'
    });
    apiMe.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'u1',
          email: 'student@academy.local',
          name: 'Student',
          role: 'user'
        }),
        { status: 200 }
      )
    );

    await expect(getSessionProfileReadOnlyFromStore(cookieStore)).resolves.toEqual({
      authenticated: true,
      user: {
        id: 'u1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user'
      }
    });

    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('refreshes once and returns authenticated profile when access is expired without mutating cookies', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'expired-access',
      academy_refresh_token: 'refresh-1'
    });

    apiMe
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u2',
            email: 'refreshed@academy.local',
            name: 'Refreshed',
            role: 'admin'
          }),
          { status: 200 }
        )
      );
    apiRefresh.mockResolvedValue(new Response('{}', { status: 200 }));
    parseLoginResponse.mockResolvedValue({
      access_token: 'new-access',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'new-refresh',
      refresh_expires_in: 604800
    });

    await expect(getSessionProfileReadOnlyFromStore(cookieStore)).resolves.toEqual({
      authenticated: true,
      user: {
        id: 'u2',
        email: 'refreshed@academy.local',
        name: 'Refreshed',
        role: 'admin'
      }
    });

    expect(cookieStore.values.get('academy_access_token')).toBe('expired-access');
    expect(cookieStore.values.get('academy_refresh_token')).toBe('refresh-1');
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('returns unauthenticated when refresh fails and never mutates cookies', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'expired-access',
      academy_refresh_token: 'expired-refresh'
    });
    apiMe.mockResolvedValue(new Response('{}', { status: 401 }));
    apiRefresh.mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(getSessionProfileReadOnlyFromStore(cookieStore)).resolves.toEqual({
      authenticated: false
    });

    expect(cookieStore.values.get('academy_access_token')).toBe('expired-access');
    expect(cookieStore.values.get('academy_refresh_token')).toBe('expired-refresh');
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('returns unauthenticated on non-401 apiMe failure and never mutates cookies', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'access-1',
      academy_refresh_token: 'refresh-1'
    });
    apiMe.mockResolvedValue(new Response('{}', { status: 500 }));

    await expect(getSessionProfileReadOnlyFromStore(cookieStore)).resolves.toEqual({
      authenticated: false
    });

    expect(apiRefresh).not.toHaveBeenCalled();
    expect(cookieStore.values.get('academy_access_token')).toBe('access-1');
    expect(cookieStore.values.get('academy_refresh_token')).toBe('refresh-1');
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });
});

describe('getSessionProfileMutableFromStore', () => {
  beforeEach(() => {
    apiMe.mockReset();
    apiRefresh.mockReset();
    parseLoginResponse.mockReset();
  });

  it('persists refreshed token pair when access is expired and refresh succeeds', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'expired-access',
      academy_refresh_token: 'refresh-1'
    });

    apiMe
      .mockResolvedValueOnce(new Response('{}', { status: 401 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 'u2',
            email: 'refreshed@academy.local',
            name: 'Refreshed',
            role: 'admin'
          }),
          { status: 200 }
        )
      );
    apiRefresh.mockResolvedValue(new Response('{}', { status: 200 }));
    parseLoginResponse.mockResolvedValue({
      access_token: 'new-access',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'new-refresh',
      refresh_expires_in: 604800
    });

    await expect(getSessionProfileMutableFromStore(cookieStore)).resolves.toEqual({
      authenticated: true,
      user: {
        id: 'u2',
        email: 'refreshed@academy.local',
        name: 'Refreshed',
        role: 'admin'
      }
    });

    expect(cookieStore.values.get('academy_access_token')).toBe('new-access');
    expect(cookieStore.values.get('academy_refresh_token')).toBe('new-refresh');
    expect(cookieStore.set).toHaveBeenCalledTimes(2);
    expect(cookieStore.delete).not.toHaveBeenCalled();
  });

  it('clears session and returns unauthenticated when refresh fails', async () => {
    const cookieStore = createCookieStore({
      academy_access_token: 'expired-access',
      academy_refresh_token: 'expired-refresh'
    });
    apiMe.mockResolvedValue(new Response('{}', { status: 401 }));
    apiRefresh.mockResolvedValue(new Response('{}', { status: 401 }));

    await expect(getSessionProfileMutableFromStore(cookieStore)).resolves.toEqual({
      authenticated: false
    });

    expect(cookieStore.values.has('academy_access_token')).toBe(false);
    expect(cookieStore.values.has('academy_refresh_token')).toBe(false);
    expect(cookieStore.delete).toHaveBeenCalledTimes(2);
  });
});
