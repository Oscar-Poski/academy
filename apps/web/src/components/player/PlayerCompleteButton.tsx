'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { evaluateModuleUnlock } from '@/src/lib/api-clients/unlocks.browser';
import { postAnalyticsEvent } from '@/src/lib/api-clients/analytics.browser';
import {
  completeSectionProgress,
  isCompletionBlockedError
} from '@/src/lib/api-clients/progress.browser';
import type { CompletionBlockedError, SectionProgress } from '@/src/lib/progress-types';

type PlayerCompleteButtonProps = {
  sectionId: string;
  hasQuizPanel: boolean;
  pathId: string;
  moduleId: string;
  initialSectionProgress?: SectionProgress | null;
  onCompleted?: () => void;
};

export function PlayerCompleteButton({
  sectionId,
  hasQuizPanel,
  pathId,
  moduleId,
  initialSectionProgress,
  onCompleted
}: PlayerCompleteButtonProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEvaluatingUnlock, setIsEvaluatingUnlock] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [completionBlocked, setCompletionBlocked] = useState<CompletionBlockedError | null>(null);
  const [isCompleted, setIsCompleted] = useState(initialSectionProgress?.status === 'completed');

  const isDisabled = isSubmitting || isRefreshing || isCompleted || isEvaluatingUnlock;
  const label = isSubmitting ? 'Completing...' : isCompleted ? 'Completed' : 'Mark Complete';

  async function handleClick() {
    if (isDisabled) {
      return;
    }

    await attemptComplete();
  }

  async function attemptComplete(): Promise<boolean> {
    setIsSubmitting(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const result = await completeSectionProgress(sectionId);

      if (result.status === 'completed') {
        setIsCompleted(true);
        setCompletionBlocked(null);
        onCompleted?.();
      }

      void postAnalyticsEvent({
        event_name: 'section_complete',
        occurred_at: new Date().toISOString(),
        idempotency_key: `section_complete:${result.id}`,
        user_id: result.userId,
        path_id: pathId,
        module_id: moduleId,
        section_id: result.sectionId,
        section_version_id: result.sectionVersionId,
        payload_json: {
          source: 'player_complete_cta'
        }
      }).catch(() => null);

      startRefreshTransition(() => {
        router.refresh();
      });
      return true;
    } catch (error) {
      if (isCompletionBlockedError(error)) {
        setCompletionBlocked(error.payload);
        return false;
      }

      setCompletionBlocked(null);
      setErrorMessage('Unable to mark section complete. Try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGoToQuiz() {
    const panel = document.getElementById('section-quiz-panel');
    if (!panel) {
      return;
    }
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    panel.focus();
  }

  async function handleEvaluateUnlock() {
    if (!completionBlocked?.requiresUnlock || isEvaluatingUnlock) {
      return;
    }

    setIsEvaluatingUnlock(true);
    setErrorMessage(null);
    setActionMessage(null);

    try {
      const decision = await evaluateModuleUnlock(moduleId);
      if (decision.isUnlocked) {
        setActionMessage('Module unlocked. Retrying completion...');
        const completed = await attemptComplete();
        if (completed) {
          return;
        }
      } else {
        setActionMessage('Module is still locked. Resolve the remaining requirements and try again.');
      }

      setCompletionBlocked((current) => {
        if (!current) {
          return current;
        }

        const mergedReasons = Array.from(new Set([...current.reasons, ...decision.reasons]));
        return {
          ...current,
          reasons: mergedReasons,
          requiresUnlock: decision.reasons.length > 0
        };
      });
    } catch {
      setErrorMessage('Unable to evaluate unlock right now. Try again.');
    } finally {
      setIsEvaluatingUnlock(false);
    }
  }

  return (
    <div className="playerFooterCenter">
      <button
        type="button"
        className={`playerNavBtn playerCompleteBtn${isCompleted ? ' isSuccess' : ''}`}
        onClick={handleClick}
        disabled={isDisabled}
      >
        {label}
      </button>
      {completionBlocked ? (
        <div className="completionBlockedCard" role="status" aria-live="polite">
          <p className="completionBlockedTitle">Completion blocked</p>
          <ul className="completionBlockedReasons">
            {completionBlocked.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <div className="completionBlockedActions">
            {completionBlocked.requiresQuizPass && hasQuizPanel ? (
              <button
                type="button"
                className="completionBlockedActionBtn"
                onClick={handleGoToQuiz}
                disabled={isDisabled}
              >
                Go to Quiz
              </button>
            ) : null}
            {completionBlocked.requiresUnlock ? (
              <button
                type="button"
                className="completionBlockedActionBtn"
                onClick={handleEvaluateUnlock}
                disabled={isDisabled}
              >
                {isEvaluatingUnlock ? 'Evaluating...' : 'Evaluate Unlock'}
              </button>
            ) : null}
          </div>
          {actionMessage ? <p className="completionBlockedMeta">{actionMessage}</p> : null}
        </div>
      ) : null}
      <div className="playerFooterError" aria-live="polite">
        {errorMessage}
      </div>
    </div>
  );
}
