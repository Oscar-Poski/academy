import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware, config } from '@/middleware';

describe('auth middleware', () => {
  it('does not include root in matcher so anonymous home is public', () => {
    expect(config.matcher).toEqual(['/learn/:path*']);
  });

  it('allows request when access token cookie exists', () => {
    const request = new NextRequest('http://localhost:3000/learn/section-1', {
      headers: {
        cookie: 'academy_access_token=token-1'
      }
    });

    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it('allows request when only refresh token cookie exists', () => {
    const request = new NextRequest('http://localhost:3000/learn/section-1', {
      headers: {
        cookie: 'academy_refresh_token=token-2'
      }
    });

    const response = middleware(request);
    expect(response.status).toBe(200);
  });

  it('redirects unauthenticated learner requests to login with next param', () => {
    const request = new NextRequest('http://localhost:3000/learn/abc');
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?next=%2Flearn%2Fabc');
  });
});
