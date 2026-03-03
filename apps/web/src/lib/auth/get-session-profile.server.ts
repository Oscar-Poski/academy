import { cookies } from 'next/headers';
import { apiMe, apiRefresh, parseLoginResponse } from './api';
import {
  clearSessionTokensOnStore,
  readSessionTokensFromStore,
  setSessionTokensOnStore
} from './session';

type CookieValue = { value: string } | undefined;

type CookieStore = {
  get(name: string): CookieValue;
  set?(name: string, value: string, options: unknown): void;
  delete?(name: string): void;
};

export type SessionProfile =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: {
        id: string;
        email: string;
        name: string;
        role: 'user' | 'admin';
    };
    };

function toSessionProfile(profile: {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}): SessionProfile {
  return {
    authenticated: true,
    user: {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role
    }
  };
}

export async function getSessionProfileMutableFromStore(cookieStore: CookieStore): Promise<SessionProfile> {
  const session = readSessionTokensFromStore(cookieStore);
  if (!session) {
    return { authenticated: false };
  }

  try {
    let me = await apiMe(session.accessToken);

    if (me.status === 401) {
      const refreshed = await apiRefresh(session.refreshToken);
      if (!refreshed.ok) {
        clearSessionTokensOnStore(cookieStore);
        return { authenticated: false };
      }

      const refreshedPayload = await parseLoginResponse(refreshed);
      setSessionTokensOnStore(cookieStore, {
        accessToken: refreshedPayload.access_token,
        refreshToken: refreshedPayload.refresh_token
      });

      me = await apiMe(refreshedPayload.access_token);
    }

    if (!me.ok) {
      clearSessionTokensOnStore(cookieStore);
      return { authenticated: false };
    }

    const profile = (await me.json()) as { id: string; email: string; name: string; role: 'user' | 'admin' };
    return toSessionProfile(profile);
  } catch {
    clearSessionTokensOnStore(cookieStore);
    return { authenticated: false };
  }
}

export async function getSessionProfileReadOnlyFromStore(cookieStore: CookieStore): Promise<SessionProfile> {
  const session = readSessionTokensFromStore(cookieStore);
  if (!session) {
    return { authenticated: false };
  }

  try {
    let me = await apiMe(session.accessToken);

    if (me.status === 401) {
      const refreshed = await apiRefresh(session.refreshToken);
      if (!refreshed.ok) {
        return { authenticated: false };
      }

      const refreshedPayload = await parseLoginResponse(refreshed);
      me = await apiMe(refreshedPayload.access_token);
    }

    if (!me.ok) {
      return { authenticated: false };
    }

    const profile = (await me.json()) as { id: string; email: string; name: string; role: 'user' | 'admin' };
    return toSessionProfile(profile);
  } catch {
    return { authenticated: false };
  }
}

// Backward-compatible alias for mutable contexts (route handlers).
export async function getSessionProfileFromStore(cookieStore: CookieStore): Promise<SessionProfile> {
  return getSessionProfileMutableFromStore(cookieStore);
}

export async function getSessionProfile(): Promise<SessionProfile> {
  return getSessionProfileReadOnlyFromStore(cookies() as CookieStore);
}
