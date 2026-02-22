'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { completeSectionProgress } from '@/src/lib/api-clients/progress.client';
import type { SectionProgress } from '@/src/lib/progress-types';

type PlayerCompleteButtonProps = {
  sectionId: string;
  initialSectionProgress?: SectionProgress | null;
};

export function PlayerCompleteButton({
  sectionId,
  initialSectionProgress
}: PlayerCompleteButtonProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(initialSectionProgress?.status === 'completed');

  const isDisabled = isSubmitting || isRefreshing || isCompleted;
  const label = isSubmitting ? 'Completing...' : isCompleted ? 'Completed' : 'Mark Complete';

  async function handleClick() {
    if (isDisabled) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await completeSectionProgress(sectionId);

      if (result.status === 'completed') {
        setIsCompleted(true);
      }

      startRefreshTransition(() => {
        router.refresh();
      });
    } catch {
      setErrorMessage('Unable to mark section complete. Try again.');
    } finally {
      setIsSubmitting(false);
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
      <div className="playerFooterError" aria-live="polite">
        {errorMessage}
      </div>
    </div>
  );
}
