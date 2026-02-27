import { describe, expect, it, vi } from 'vitest';
import { BrowserQuizApiError, submitQuizAttempt } from './quiz.browser';

describe('quiz.browser client', () => {
  it('sends expected payload and returns parsed response', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ attemptId: 'attempt-1' }), { status: 201 })
    );

    const payload = await submitQuizAttempt('section-1', {
      answers: [{ question_id: 'q1', selected_option: 'GET' }]
    });

    expect(payload).toEqual({ attemptId: 'attempt-1' });
    expect(fetchSpy).toHaveBeenCalledWith('/api/quizzes/sections/section-1/attempts', {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({ answers: [{ question_id: 'q1', selected_option: 'GET' }] })
    });

    fetchSpy.mockRestore();
  });

  it('throws typed error on non-2xx response', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ code: 'invalid' }), { status: 400 }));

    await expect(
      submitQuizAttempt('section-1', {
        answers: [{ question_id: 'q1', selected_option: 'GET' }]
      })
    ).rejects.toBeInstanceOf(BrowserQuizApiError);

    fetchSpy.mockRestore();
  });
});
