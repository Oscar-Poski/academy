import { cookies } from 'next/headers';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  SESSION_COOKIE_PATH,
  SESSION_COOKIE_SAME_SITE,
  shouldUseSecureCookies
} from './constants';
import type { SessionTokens } from './types';

type CookieValue = { value: string } | undefined;

type CookieReader = {
  get(name: string): CookieValue;
};

type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): void;
  delete(name: string): void;
};

type CookieStore = CookieReader & Partial<CookieWriter>;

type CookieOptions = {
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
};

export function getSessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: SESSION_COOKIE_SAME_SITE,
    secure: shouldUseSecureCookies(),
    path: SESSION_COOKIE_PATH
  };
}

export function readSessionTokensFromStore(store: CookieReader): SessionTokens | null {
  const accessToken = store.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  const refreshToken = store.get(REFRESH_TOKEN_COOKIE)?.value?.trim();

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function setSessionTokensOnStore(store: CookieStore, tokens: SessionTokens): void {
  if (typeof store.set !== 'function') {
    return;
  }

  const options = getSessionCookieOptions();
  store.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, options);
  store.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, options);
}

export function clearSessionTokensOnStore(store: CookieStore): void {
  if (typeof store.delete !== 'function') {
    return;
  }

  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

export function readSessionTokens(): SessionTokens | null {
  return readSessionTokensFromStore(cookies());
}

export function setSessionTokens(tokens: SessionTokens): void {
  setSessionTokensOnStore(cookies(), tokens);
}

export function clearSessionTokens(): void {
  clearSessionTokensOnStore(cookies());
}
