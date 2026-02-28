import { NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/src/lib/auth/constants';

export async function POST(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json(
      { code: 'invalid_request', message: 'Invalid analytics payload' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(`${getApiBaseUrl()}/v1/analytics/events`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const payload = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json({ code: 'internal_error', message: 'Unexpected server error' }, { status: 500 });
  }
}
