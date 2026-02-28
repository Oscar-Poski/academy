import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerCompleteButton } from './PlayerCompleteButton';

const routerRefresh = vi.fn();
const completeSectionProgress = vi.fn();
const isCompletionBlockedError = vi.fn();
const evaluateModuleUnlock = vi.fn();
const postAnalyticsEvent = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: routerRefresh
  })
}));

vi.mock('@/src/lib/api-clients/progress.browser', () => ({
  completeSectionProgress: (...args: unknown[]) => completeSectionProgress(...args),
  isCompletionBlockedError: (...args: unknown[]) => isCompletionBlockedError(...args)
}));

vi.mock('@/src/lib/api-clients/unlocks.browser', () => ({
  evaluateModuleUnlock: (...args: unknown[]) => evaluateModuleUnlock(...args)
}));

vi.mock('@/src/lib/api-clients/analytics.browser', () => ({
  postAnalyticsEvent: (...args: unknown[]) => postAnalyticsEvent(...args)
}));

const blockedError = {
  payload: {
    code: 'completion_blocked',
    reasons: ['Pass the quiz first', 'Unlock requirements unmet'],
    requiresQuizPass: true,
    requiresUnlock: true
  }
};

const completedProgress = {
  id: 'progress-1',
  userId: 'user-1',
  sectionId: 'section-1',
  sectionVersionId: 'version-1',
  status: 'completed',
  startedAt: null,
  lastSeenAt: null,
  completedAt: new Date().toISOString(),
  completionPct: 100,
  lastBlockOrder: 3,
  timeSpentSeconds: 120
} as const;

describe('PlayerCompleteButton', () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    completeSectionProgress.mockReset();
    isCompletionBlockedError.mockReset();
    evaluateModuleUnlock.mockReset();
    postAnalyticsEvent.mockReset();
    postAnalyticsEvent.mockResolvedValue(undefined);
    isCompletionBlockedError.mockImplementation((error: unknown) => error === blockedError);
  });

  function renderButton(hasQuizPanel = true) {
    return render(
      <PlayerCompleteButton
        sectionId="section-1"
        moduleId="module-1"
        pathId="path-1"
        hasQuizPanel={hasQuizPanel}
      />
    );
  }

  it('renders blocked card and reasons on completion_blocked', async () => {
    completeSectionProgress.mockRejectedValue(blockedError);
    renderButton(true);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByText('Completion blocked')).toBeInTheDocument();
    });

    expect(screen.getByText('Pass the quiz first')).toBeInTheDocument();
    expect(screen.getByText('Unlock requirements unmet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go to Quiz' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Evaluate Unlock' })).toBeInTheDocument();
  });

  it('go to quiz action scrolls and focuses quiz panel', async () => {
    completeSectionProgress.mockRejectedValue(blockedError);
    const scrollIntoView = vi.fn();
    const focus = vi.fn();
    const getByIdSpy = vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      if (id !== 'section-quiz-panel') {
        return null;
      }
      return { scrollIntoView, focus } as unknown as HTMLElement;
    });

    renderButton(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Go to Quiz' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Go to Quiz' }));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();

    getByIdSpy.mockRestore();
  });

  it('evaluate unlock auto-retries completion and transitions to completed state', async () => {
    completeSectionProgress.mockRejectedValueOnce(blockedError).mockResolvedValueOnce(completedProgress);
    evaluateModuleUnlock.mockResolvedValue({
      moduleId: 'module-1',
      isUnlocked: true,
      reasons: [],
      requiresCredits: false,
      creditsCost: 0
    });

    renderButton(true);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Evaluate Unlock' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Evaluate Unlock' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Completed' })).toBeInTheDocument();
    });

    expect(evaluateModuleUnlock).toHaveBeenCalledWith('module-1');
    expect(completeSectionProgress).toHaveBeenCalledTimes(2);
  });

  it('evaluate unlock unresolved keeps blocked state and updates reasons', async () => {
    completeSectionProgress.mockRejectedValue(blockedError);
    evaluateModuleUnlock.mockResolvedValue({
      moduleId: 'module-1',
      isUnlocked: false,
      reasons: ['Complete module prerequisites'],
      requiresCredits: false,
      creditsCost: 0
    });

    renderButton(false);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Evaluate Unlock' })).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: 'Go to Quiz' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Evaluate Unlock' }));

    await waitFor(() => {
      expect(screen.getByText('Module is still locked. Resolve the remaining requirements and try again.')).toBeInTheDocument();
    });

    expect(screen.getByText('Complete module prerequisites')).toBeInTheDocument();
  });

  it('non-blocked failure keeps generic fallback error', async () => {
    completeSectionProgress.mockRejectedValue(new Error('network'));
    isCompletionBlockedError.mockReturnValue(false);
    renderButton(true);

    fireEvent.click(screen.getByRole('button', { name: 'Mark Complete' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to mark section complete. Try again.')).toBeInTheDocument();
    });
  });
});
