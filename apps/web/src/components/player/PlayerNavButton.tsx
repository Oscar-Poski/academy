'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { actionClassName } from '@/src/components/ui';
import { updateSectionPosition } from '@/src/lib/api-clients/progress.browser';
import { microcopy } from '@/src/lib/copy/microcopy';

type PlayerNavButtonProps = {
  direction: 'prev' | 'next';
  label: string;
  targetSectionId: string | null;
  currentSectionId: string;
  lastBlockOrderToPersist: number;
  isLocked?: boolean;
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
  const navButtonClassName = actionClassName({
    variant: 'secondary',
    size: 'md',
    className: 'playerNavBtn'
  });
  const disabledNavButtonClassName = actionClassName({
    variant: 'secondary',
    size: 'md',
    disabled: true,
    className: 'playerNavBtn isDisabled'
  });

  if (!targetSectionId || isLocked) {
    const unavailableReason = isLocked
      ? microcopy.player.navigationUnavailable.locked
      : microcopy.player.navigationUnavailable.missingTarget;

    return (
      <span
        className={disabledNavButtonClassName}
        aria-disabled="true"
        role="note"
        aria-label={`${label} no disponible: ${unavailableReason}`}
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
      className={isNavigating ? disabledNavButtonClassName : navButtonClassName}
      onClick={handleClick}
      disabled={isNavigating}
      data-direction={direction}
    >
      {label}
    </button>
  );
}
