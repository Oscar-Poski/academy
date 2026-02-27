import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { apiLogout } from '@/src/lib/auth/api';
import { clearSessionTokensOnStore, readSessionTokensFromStore } from '@/src/lib/auth/session';

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ success: true }, { status: 200 });
  const tokens = readSessionTokensFromStore(cookies());

  if (tokens?.refreshToken) {
    await apiLogout(tokens.refreshToken).catch(() => null);
  }

  clearSessionTokensOnStore(response.cookies);
  return response;
}
