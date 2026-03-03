'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { Alert } from '@/src/components/ui';
import { evaluateModuleUnlock } from '@/src/lib/api-clients/unlocks.browser';
import { postAnalyticsEvent } from '@/src/lib/api-clients/analytics.browser';
import { microcopy } from '@/src/lib/copy/microcopy';
import {
  completeSectionProgress,
  isCompletionBlockedError
} from '@/src/lib/api-clients/progress.browser';
import { getErrorMessageFromUnknown, getReasonMessage } from '@/src/lib/errors/error-messages';
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
  const label = isSubmitting
    ? microcopy.player.complete.completing
    : isCompleted
      ? microcopy.player.complete.completed
      : microcopy.player.complete.action;

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
      setErrorMessage(getErrorMessageFromUnknown(error, microcopy.player.complete.completeFailed));
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
        setActionMessage(microcopy.player.complete.unlockedRetrying);
        const completed = await attemptComplete();
        if (completed) {
          return;
        }
      } else {
        setActionMessage(microcopy.player.complete.stillLocked);
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
      setErrorMessage(microcopy.player.complete.evaluateFailed);
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
        <div
          className="completionBlockedCard"
          role="region"
          aria-live="polite"
          aria-labelledby="completion-blocked-title"
        >
          <p id="completion-blocked-title" className="completionBlockedTitle">
            {microcopy.player.complete.blockedTitle}
          </p>
          <ul className="completionBlockedReasons">
            {completionBlocked.reasons.map((reason) => (
              <li key={reason}>{getReasonMessage(reason)}</li>
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
                {microcopy.player.complete.goToQuiz}
              </button>
            ) : null}
            {completionBlocked.requiresUnlock ? (
              <button
                type="button"
                className="completionBlockedActionBtn"
                onClick={handleEvaluateUnlock}
                disabled={isDisabled}
              >
                {isEvaluatingUnlock
                  ? microcopy.player.complete.evaluatingUnlock
                  : microcopy.player.complete.evaluateUnlock}
              </button>
            ) : null}
          </div>
          {actionMessage ? (
            <p className="completionBlockedMeta" role="status" aria-live="polite">
              {actionMessage}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="playerFooterError">
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
      </div>
    </div>
  );
}
