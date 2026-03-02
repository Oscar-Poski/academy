import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const apiMe = vi.fn();
const apiRefresh = vi.fn();
const parseLoginResponse = vi.fn();

vi.mock('next/headers', () => ({
  cookies: () => cookieStore
}));

vi.mock('@/src/lib/auth/api', () => ({
  apiLogin,
  apiRegister,
  apiLogout,
  apiMe,
  apiRefresh,
  parseLoginResponse
}));

describe('auth route handlers', () => {
  beforeEach(() => {
    cookieStore.values.clear();
    apiLogin.mockReset();
    apiRegister.mockReset();
    apiLogout.mockReset();
    apiMe.mockReset();
    apiRefresh.mockReset();
    parseLoginResponse.mockReset();
  });

  it('POST /api/auth/login sets access and refresh cookies on success', async () => {
    apiLogin.mockResolvedValue(new Response('{}', { status: 200 }));
    parseLoginResponse.mockResolvedValue({
      access_token: 'access-1',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'refresh-1',
      refresh_expires_in: 604800
    });

    const { POST } = await import('@/app/api/auth/login/route');

    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'student@academy.local', password: 'password123' })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('academy_access_token=access-1');
    expect(response.headers.get('set-cookie')).toContain('academy_refresh_token=refresh-1');
  });

  it('POST /api/auth/login returns invalid credentials shape on auth failure', async () => {
    apiLogin.mockResolvedValue(
      new Response(
        JSON.stringify({ code: 'invalid_credentials', message: 'Invalid email or password' }),
        { status: 401 }
      )
    );

    const { POST } = await import('@/app/api/auth/login/route');

    const response = await POST(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'student@academy.local', password: 'wrong' })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      code: 'invalid_credentials',
      message: 'Invalid email or password'
    });
  });

  it('POST /api/auth/register sets access and refresh cookies on success', async () => {
    apiRegister.mockResolvedValue(new Response('{}', { status: 201 }));
    parseLoginResponse.mockResolvedValue({
      access_token: 'access-register-1',
      token_type: 'Bearer',
      expires_in: 900,
      refresh_token: 'refresh-register-1',
      refresh_expires_in: 604800
    });

    const { POST } = await import('@/app/api/auth/register/route');

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'New Student',
          email: 'new.student@academy.local',
          password: 'password123'
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('academy_access_token=access-register-1');
    expect(response.headers.get('set-cookie')).toContain('academy_refresh_token=refresh-register-1');
  });

  it('POST /api/auth/register passes duplicate email conflict payload through', async () => {
    apiRegister.mockResolvedValue(
      new Response(JSON.stringify({ code: 'email_in_use', message: 'Email already registered' }), {
        status: 409
      })
    );

    const { POST } = await import('@/app/api/auth/register/route');

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'New Student',
          email: 'new.student@academy.local',
          password: 'password123'
        })
      })
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      code: 'email_in_use',
      message: 'Email already registered'
    });
  });

  it('POST /api/auth/register returns invalid registration input for malformed body', async () => {
    const { POST } = await import('@/app/api/auth/register/route');

    const response = await POST(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'new.student@academy.local',
          password: 'password123'
        })
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      code: 'invalid_registration_input',
      message: 'Invalid registration input'
    });
  });

  it('POST /api/auth/logout clears cookies even when upstream fails', async () => {
    cookieStore.values.set('academy_access_token', 'access-1');
    cookieStore.values.set('academy_refresh_token', 'refresh-1');
    apiLogout.mockRejectedValue(new Error('network'));

    const { POST } = await import('@/app/api/auth/logout/route');

    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('academy_access_token=;');
    expect(response.headers.get('set-cookie')).toContain('academy_refresh_token=;');
  });
});
