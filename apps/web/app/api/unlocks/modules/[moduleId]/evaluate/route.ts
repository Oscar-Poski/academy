import { NextResponse } from 'next/server';
import { AuthenticatedApiError, fetchWithAuth } from '@/src/lib/api-clients/authenticated-fetch.server';
import type { UnlockDecision } from '@/src/lib/unlock-types';

type RouteContext = {
  params: {
    moduleId: string;
  };
};

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const upstream = await fetchWithAuth(`/v1/unlocks/modules/${context.params.moduleId}/evaluate`, {
      method: 'POST'
    });

    const payload = (await upstream.json().catch(() => null)) as
      | UnlockDecision
      | { code?: string; message?: string }
      | null;

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    if (error instanceof AuthenticatedApiError) {
      return NextResponse.json(
        { code: 'unauthorized', message: 'Invalid or missing bearer token' },
        { status: error.status }
      );
    }

    return NextResponse.json({ code: 'internal_error', message: 'Unexpected server error' }, { status: 500 });
  }
}
