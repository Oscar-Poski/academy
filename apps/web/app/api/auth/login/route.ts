import { NextResponse } from 'next/server';
import { apiLogin, parseLoginResponse } from '@/src/lib/auth/api';
import { setSessionTokensOnStore } from '@/src/lib/auth/session';
import type { AuthApiError, LoginRequestBody } from '@/src/lib/auth/types';

function isLoginBody(value: unknown): value is LoginRequestBody {
  return !!value && typeof value === 'object' && 'email' in value && 'password' in value;
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!isLoginBody(body)) {
    return NextResponse.json(
      {
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      } satisfies AuthApiError,
      { status: 401 }
    );
  }

  const upstream = await apiLogin({ email: body.email, password: body.password });

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as AuthApiError | null;
    return NextResponse.json(
      payload ?? {
        code: 'invalid_credentials',
        message: 'Invalid email or password'
      },
      { status: upstream.status }
    );
  }

  const login = await parseLoginResponse(upstream);
  const response = NextResponse.json({ success: true }, { status: 200 });

  setSessionTokensOnStore(response.cookies, {
    accessToken: login.access_token,
    refreshToken: login.refresh_token
  });

  return response;
}
