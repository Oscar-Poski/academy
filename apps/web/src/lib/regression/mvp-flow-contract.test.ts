import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';
import { microcopy } from '@/src/lib/copy/microcopy';
import { getErrorMessageFromUnknown } from '@/src/lib/errors/error-messages';

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

describe('MVP flow contracts', () => {
  beforeEach(() => {
    cookieStore.values.clear();
    apiLogin.mockReset();
    apiRegister.mockReset();
    apiLogout.mockReset();
    parseLoginResponse.mockReset();
  });

  it('preserves register/login/logout BFF cookie session lifecycle contracts', async () => {
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
          name: 'Flow User',
          email: 'flow@academy.local',
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
          email: 'flow@academy.local',
          password: 'password123'
        })
      })
    );

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers.get('set-cookie')).toContain('academy_access_token=login-access-1');
    expect(loginResponse.headers.get('set-cookie')).toContain('academy_refresh_token=login-refresh-1');

    cookieStore.values.set('academy_access_token', 'login-access-1');
    cookieStore.values.set('academy_refresh_token', 'login-refresh-1');
    apiLogout.mockResolvedValue(new Response('{}', { status: 200 }));

    const { POST: logoutRoute } = await import('@/app/api/auth/logout/route');
    const logoutResponse = await logoutRoute();

    expect(logoutResponse.status).toBe(200);
    expect(logoutResponse.headers.get('set-cookie')).toContain('academy_access_token=;');
    expect(logoutResponse.headers.get('set-cookie')).toContain('academy_refresh_token=;');
  });

  it('preserves protected-route semantics: refresh cookie passes coarse gate, no cookie redirects', () => {
    const withRefresh = middleware(
      new NextRequest('http://localhost:3000/learn/section-1', {
        headers: {
          cookie: 'academy_refresh_token=refresh-1'
        }
      })
    );
    expect(withRefresh.status).toBe(200);

    const withoutCookies = middleware(new NextRequest('http://localhost:3000/learn/section-1'));
    expect(withoutCookies.status).toBe(307);
    expect(withoutCookies.headers.get('location')).toContain('/login?next=%2Flearn%2Fsection-1');
  });

  it('keeps home onboarding/continue labels deterministic', () => {
    function getHomePrimaryAction(source: 'resume' | 'fallback'): string {
      return source === 'resume' ? microcopy.home.resumeSection : microcopy.home.startLearning;
    }

    expect(getHomePrimaryAction('resume')).toBe('Retomar sección');
    expect(getHomePrimaryAction('fallback')).toBe('Comenzar a aprender');
    expect(microcopy.home.onboardingCta).toBe('Comenzar mi primera sección');
    expect(microcopy.home.fallback).toBe(
      'Las recomendaciones de aprendizaje no están disponibles por el momento.'
    );
  });

  it('keeps player and quiz error messages standardized and non-fatal', () => {
    expect(getErrorMessageFromUnknown(new Error('network'), microcopy.quiz.submitFailed)).toBe(
      microcopy.quiz.submitFailed
    );
    expect(
      getErrorMessageFromUnknown(
        { payload: { code: 'internal_error', message: 'Backend failed' } },
        microcopy.player.complete.completeFailed
      )
    ).toBe(microcopy.errors.internalError);
    expect(
      getErrorMessageFromUnknown(
        { payload: { code: 'unauthorized', message: 'Unauthorized' } },
        microcopy.player.complete.completeFailed
      )
    ).toBe(microcopy.errors.unauthorized);
  });
});
