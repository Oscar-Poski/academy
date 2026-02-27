import type { QuizAttemptResult, QuizSubmissionRequest } from '@/src/lib/quiz-types';

export class BrowserQuizApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'BrowserQuizApiError';
  }
}

export async function submitQuizAttempt(
  sectionId: string,
  body: QuizSubmissionRequest
): Promise<QuizAttemptResult> {
  const response = await fetch(`/api/quizzes/sections/${sectionId}/attempts`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new BrowserQuizApiError(`Quiz attempt request failed for section ${sectionId}`, response.status);
  }

  return (await response.json()) as QuizAttemptResult;
}
