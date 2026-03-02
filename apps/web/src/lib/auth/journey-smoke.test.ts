import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

const cookieStore = {
  values: new Map<string, string>(),
  get(name: string) {
    const value = cookieStore.values.get(name);
    return value ? { value } : undefined;
  },
  set(name: string, value: string) {
    cookieStore.values.set(name, value);
  },
  delete(name: string) {
    cookieStore.values.delete(name);
  }
};

const apiLogin = vi.fn();
const apiRegister = vi.fn();
const apiLogout = vi.fn();
const parseLoginResponse = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => cookieStore
}));

vi.mock('@/src/lib/auth/api', () => ({
  apiLogin,
  apiRegister,
  apiLogout,
  parseLoginResponse
}));

describe('auth journey smoke (web integration)', () => {
  it('register -> protected route allowed -> logout -> protected route redirected -> login -> protected route allowed', async () => {
    cookieStore.values.clear();
    apiLogin.mockReset();
    apiRegister.mockReset();
    apiLogout.mockReset();
    parseLoginResponse.mockReset();

    apiRegister.mockResolvedValue(new Response('{}', { status: 201 }));
    parseLoginResponse.mockResolvedValueOnce({
      access_token: 'register-access-1',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'register-refresh-1',
      refresh_expires_in: 604800
    });

    const { POST: registerRoute } = await import('@/app/api/auth/register/route');
    const registerResponse = await registerRoute(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Journey User',
          email: 'journey@academy.local',
          password: 'password123'
        })
      })
    );

    expect(registerResponse.status).toBe(200);
    expect(registerResponse.headers.get('set-cookie')).toContain(
      'academy_access_token=register-access-1'
    );
    expect(registerResponse.headers.get('set-cookie')).toContain(
      'academy_refresh_token=register-refresh-1'
    );

    const allowedWithAccess = middleware(
      new NextRequest('http://localhost:3000/learn/section-1', {
        headers: {
          cookie: 'academy_access_token=register-access-1'
        }
      })
    );
    expect(allowedWithAccess.status).toBe(200);

    cookieStore.values.set('academy_access_token', 'register-access-1');
    cookieStore.values.set('academy_refresh_token', 'register-refresh-1');
    apiLogout.mockResolvedValue(new Response('{}', { status: 200 }));

    const { POST: logoutRoute } = await import('@/app/api/auth/logout/route');
    const logoutResponse = await logoutRoute();
    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get('set-cookie')).toContain('academy_access_token=;');
    expect(logoutResponse.headers.get('set-cookie')).toContain('academy_refresh_token=;');

    const redirectedWithoutCookies = middleware(new NextRequest('http://localhost:3000/'));
    expect(redirectedWithoutCookies.status).toBe(307);
    expect(redirectedWithoutCookies.headers.get('location')).toContain('/login?next=%2F');

    apiLogin.mockResolvedValue(new Response('{}', { status: 200 }));
    parseLoginResponse.mockResolvedValueOnce({
      access_token: 'login-access-1',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'login-refresh-1',
      refresh_expires_in: 604800
    });

    const { POST: loginRoute } = await import('@/app/api/auth/login/route');
    const loginResponse = await loginRoute(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'journey@academy.local',
          password: 'password123'
        })
      })
    );

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers.get('set-cookie')).toContain('academy_access_token=login-access-1');
    expect(loginResponse.headers.get('set-cookie')).toContain(
      'academy_refresh_token=login-refresh-1'
    );

    const allowedWithRefreshOnly = middleware(
      new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'academy_refresh_token=login-refresh-1'
        }
      })
    );
    expect(allowedWithRefreshOnly.status).toBe(200);
  });
});
