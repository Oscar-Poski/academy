import { describe, expect, it, vi } from 'vitest';
import {
  BrowserProgressApiError,
  completeSectionProgress,
  isCompletionBlockedError
} from './progress.browser';

describe('progress.browser client', () => {
  it('throws typed blocked payload on 409 completion_blocked', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'completion_blocked',
          reasons: ['Pass quiz first'],
          requiresQuizPass: true,
          requiresUnlock: false
        }),
        { status: 409 }
      )
    );

    let caught: unknown;
    try {
      await completeSectionProgress('section-1');
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(BrowserProgressApiError);
    expect(isCompletionBlockedError(caught)).toBe(true);
    expect((caught as BrowserProgressApiError).payload).toEqual({
      code: 'completion_blocked',
      reasons: ['Pass quiz first'],
      requiresQuizPass: true,
      requiresUnlock: false
    });

    fetchSpy.mockRestore();
  });
});
