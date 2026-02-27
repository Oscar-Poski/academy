import { NextResponse } from 'next/server';
import { fetchJsonWithAuth, AuthenticatedApiError } from '@/src/lib/api-clients/authenticated-fetch.server';
import type { SectionProgress, UpdateSectionPositionRequest } from '@/src/lib/progress-types';

type RouteContext = {
  params: {
    sectionId: string;
  };
};

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const body = (await request.json().catch(() => null)) as UpdateSectionPositionRequest | null;

  if (!body || typeof body.last_block_order !== 'number' || typeof body.time_spent_delta !== 'number') {
    return NextResponse.json({ code: 'invalid_request', message: 'Invalid section position payload' }, { status: 400 });
  }

  try {
    const payload = await fetchJsonWithAuth<SectionProgress>(
      `/v1/progress/sections/${context.params.sectionId}/position`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const status = error instanceof AuthenticatedApiError ? error.status : 500;
    return NextResponse.json({ code: 'unauthorized', message: 'Invalid or missing bearer token' }, { status });
  }
}
