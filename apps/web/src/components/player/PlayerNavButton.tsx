'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { updateSectionPosition } from '@/src/lib/api-clients/progress.client';

type PlayerNavButtonProps = {
  direction: 'prev' | 'next';
  label: string;
  targetSectionId: string | null;
  currentSectionId: string;
  lastBlockOrderToPersist: number;
  isLocked?: boolean;
  lockReason?: string | null;
};

export function PlayerNavButton({
  direction,
  label,
  targetSectionId,
  currentSectionId,
  lastBlockOrderToPersist,
  isLocked
}: PlayerNavButtonProps) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  if (!targetSectionId || isLocked) {
    return (
      <span
        className="playerNavBtn isDisabled"
        aria-disabled="true"
        data-direction={direction}
      >
        {label}
      </span>
    );
  }

  async function handleClick() {
    if (isNavigating || isLocked || !targetSectionId) {
      return;
    }

    setIsNavigating(true);

    try {
      await updateSectionPosition(currentSectionId, {
        last_block_order: lastBlockOrderToPersist,
        time_spent_delta: 0
      });
    } catch {
      // Best-effort checkpoint save only; navigation should proceed even if progress update fails.
    } finally {
      router.push(`/learn/${targetSectionId}`);
    }
  }

  return (
    <button
      type="button"
      className={`playerNavBtn${isNavigating ? ' isDisabled' : ''}`}
      onClick={handleClick}
      disabled={isNavigating}
      data-direction={direction}
    >
      {label}
    </button>
  );
}
