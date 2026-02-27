import type { QuizDelivery } from '@/src/lib/quiz-types';
import { AuthenticatedApiError, fetchJsonWithAuth } from './authenticated-fetch.server';

export async function getQuizDelivery(sectionId: string): Promise<QuizDelivery | null> {
  try {
    return await fetchJsonWithAuth<QuizDelivery>(`/v1/quizzes/sections/${sectionId}`);
  } catch (error) {
    if (error instanceof AuthenticatedApiError && error.status === 404) {
      return null;
    }

    throw error;
  }
}
