import { NextResponse } from 'next/server';
import { apiRegister, parseLoginResponse } from '@/src/lib/auth/api';
import { setSessionTokensOnStore } from '@/src/lib/auth/session';
import type { AuthApiError, RegisterRequestBody } from '@/src/lib/auth/types';

function isRegisterBody(value: unknown): value is RegisterRequestBody {
  return (
    !!value &&
    typeof value === 'object' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'password' in value &&
    typeof value.password === 'string' &&
    'name' in value &&
    typeof value.name === 'string'
  );
}

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!isRegisterBody(body)) {
    return NextResponse.json(
      {
        code: 'invalid_registration_input',
        message: 'Invalid registration input'
      } satisfies AuthApiError,
      { status: 400 }
    );
  }

  const upstream = await apiRegister({
    email: body.email,
    password: body.password,
    name: body.name
  });

  if (!upstream.ok) {
    const payload = (await upstream.json().catch(() => null)) as AuthApiError | null;
    return NextResponse.json(
      payload ?? {
        code: 'invalid_registration_input',
        message: 'Invalid registration input'
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
