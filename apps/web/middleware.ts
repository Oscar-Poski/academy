import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from '@/src/lib/auth/constants';

export function middleware(request: NextRequest): NextResponse {
  const access = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  const refresh = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value?.trim();

  if (access || refresh) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/', '/learn/:path*']
};
