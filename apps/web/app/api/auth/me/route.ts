import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiMe, apiRefresh, parseLoginResponse } from '@/src/lib/auth/api';
import {
  clearSessionTokensOnStore,
  readSessionTokensFromStore,
  setSessionTokensOnStore
} from '@/src/lib/auth/session';
import type { AuthApiError } from '@/src/lib/auth/types';

export async function GET(): Promise<Response> {
  const response = NextResponse.json({ authenticated: false }, { status: 401 });
  const tokens = readSessionTokensFromStore(cookies());

  if (!tokens) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      } satisfies AuthApiError,
      { status: 401 }
    );
  }

  let me = await apiMe(tokens.accessToken);

  if (me.status === 401) {
    const refreshed = await apiRefresh(tokens.refreshToken);
    if (!refreshed.ok) {
      clearSessionTokensOnStore(response.cookies);
      return NextResponse.json(
        {
          code: 'unauthorized',
          message: 'Invalid or missing bearer token'
        } satisfies AuthApiError,
        { status: 401, headers: response.headers }
      );
    }

    const refreshedPayload = await parseLoginResponse(refreshed);
    setSessionTokensOnStore(response.cookies, {
      accessToken: refreshedPayload.access_token,
      refreshToken: refreshedPayload.refresh_token
    });

    me = await apiMe(refreshedPayload.access_token);
  }

  if (!me.ok) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        message: 'Invalid or missing bearer token'
      } satisfies AuthApiError,
      { status: 401, headers: response.headers }
    );
  }

  const profile = await me.json();
  return NextResponse.json(profile, { status: 200, headers: response.headers });
}
