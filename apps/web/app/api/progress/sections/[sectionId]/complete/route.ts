import { NextResponse } from 'next/server';
import { fetchJsonWithAuth, AuthenticatedApiError } from '@/src/lib/api-clients/authenticated-fetch.server';
import type { SectionProgress } from '@/src/lib/progress-types';

type RouteContext = {
  params: {
    sectionId: string;
  };
};

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  try {
    const payload = await fetchJsonWithAuth<SectionProgress>(
      `/v1/progress/sections/${context.params.sectionId}/complete`,
      { method: 'POST' }
    );

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const status = error instanceof AuthenticatedApiError ? error.status : 500;
    return NextResponse.json({ code: 'unauthorized', message: 'Invalid or missing bearer token' }, { status });
  }
}
