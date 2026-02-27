import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/src/lib/auth/constants';
import {
  clearSessionTokensOnStore,
  readSessionTokensFromStore,
  setSessionTokensOnStore
} from '@/src/lib/auth/session';
import type { LoginApiResponse } from '@/src/lib/auth/types';

export class AuthenticatedApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'AuthenticatedApiError';
  }
}

type CookieValue = { value: string } | undefined;

type CookieStore = {
  get(name: string): CookieValue;
  set?(name: string, value: string, options: unknown): void;
  delete?(name: string): void;
};

export async function fetchWithAuth(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = cookies() as CookieStore;
  const session = readSessionTokensFromStore(cookieStore);

  if (!session) {
    throw new AuthenticatedApiError('Missing authenticated session', 401);
  }

  const first = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: withBearer(init?.headers, session.accessToken)
  });

  if (first.status !== 401) {
    return first;
  }

  if (typeof cookieStore.set !== 'function' || typeof cookieStore.delete !== 'function') {
    clearSessionTokensOnStore(cookieStore);
    throw new AuthenticatedApiError('Unauthenticated', 401);
  }

  const refreshed = await refreshAccessToken(cookieStore, session.refreshToken);
  if (!refreshed) {
    clearSessionTokensOnStore(cookieStore);
    throw new AuthenticatedApiError('Unauthenticated', 401);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init,
    headers: withBearer(init?.headers, refreshed.accessToken)
  });
}

export async function fetchJsonWithAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetchWithAuth(path, init);

  if (!response.ok) {
    throw new AuthenticatedApiError(`Authenticated request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchPublicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: 'no-store',
    ...init
  });

  if (!response.ok) {
    throw new AuthenticatedApiError(`Public request failed for ${path}`, response.status);
  }

  return (await response.json()) as T;
}

export async function fetchJsonWithOptionalAuth<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetchWithAuth(path, init);
    if (response.ok) {
      return (await response.json()) as T;
    }
  } catch {
    // optional auth: fall back to anonymous request
  }

  return fetchPublicJson<T>(path, init);
}

function withBearer(headers: HeadersInit | undefined, token: string): Headers {
  const merged = new Headers(headers);
  merged.set('Authorization', `Bearer ${token}`);
  return merged;
}

async function refreshAccessToken(
  cookieStore: CookieStore,
  refreshToken: string
): Promise<{ accessToken: string } | null> {
  const response = await fetch(`${getApiBaseUrl()}/v1/auth/refresh`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: refreshToken })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as LoginApiResponse;
  setSessionTokensOnStore(cookieStore, {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token
  });

  return { accessToken: payload.access_token };
}
