import { NextResponse } from 'next/server';
import { AuthenticatedApiError, fetchWithAuth } from '@/src/lib/api-clients/authenticated-fetch.server';
import type { QuizAttemptResult, QuizSubmissionRequest } from '@/src/lib/quiz-types';

type RouteContext = {
  params: {
    sectionId: string;
  };
};

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const body = (await request.json().catch(() => null)) as QuizSubmissionRequest | null;

  if (!body || !Array.isArray(body.answers)) {
    return NextResponse.json({ code: 'invalid_request', message: 'Invalid quiz submission payload' }, { status: 400 });
  }

  try {
    const upstream = await fetchWithAuth(`/v1/quizzes/sections/${context.params.sectionId}/attempts`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const payload = (await upstream.json().catch(() => null)) as QuizAttemptResult | { code?: string; message?: string } | null;

    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    const status = error instanceof AuthenticatedApiError ? error.status : 500;
    return NextResponse.json({ code: 'unauthorized', message: 'Invalid or missing bearer token' }, { status });
  }
}
