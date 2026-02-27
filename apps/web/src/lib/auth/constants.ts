export const ACCESS_TOKEN_COOKIE = 'academy_access_token';
export const REFRESH_TOKEN_COOKIE = 'academy_refresh_token';

export const SESSION_COOKIE_PATH = '/';
export const SESSION_COOKIE_SAME_SITE = 'lax' as const;

export function getApiBaseUrl(): string {
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (publicBase) {
    return publicBase;
  }

  const serverBase = process.env.API_BASE_URL?.trim();
  if (serverBase) {
    return serverBase;
  }

  return 'http://localhost:3001';
}

export function shouldUseSecureCookies(): boolean {
  return process.env.NODE_ENV === 'production';
}
