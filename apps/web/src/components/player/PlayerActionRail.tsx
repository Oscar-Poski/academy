import React from 'react';
import type { SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress } from '@/src/lib/progress-types';
import { PlayerCompleteButton } from './PlayerCompleteButton';
import { PlayerNavButton } from './PlayerNavButton';

type PlayerActionRailProps = {
  currentSectionId: string;
  navigation: SectionNavigation;
  lastBlockOrderToPersist: number;
  hasQuizPanel: boolean;
  pathId: string;
  moduleId: string;
  sectionProgress?: SectionProgress | null;
  onCompleted?: () => void;
};

export function PlayerActionRail({
  currentSectionId,
  navigation,
  lastBlockOrderToPersist,
  hasQuizPanel,
  pathId,
  moduleId,
  sectionProgress,
  onCompleted
}: PlayerActionRailProps) {
  const prevLockReason = navigation.prevSectionLock?.reasons[0] ?? null;
  const nextLockReason = navigation.nextSectionLock?.reasons[0] ?? null;
  const footerLockReason =
    (navigation.nextSectionLock?.isLocked ? nextLockReason : null) ??
    (navigation.prevSectionLock?.isLocked ? prevLockReason : null);

  return (
    <footer className="playerFooter playerActionRail playerCard">
      <div className="playerActionRailInner">
        <PlayerNavButton
          direction="prev"
          label="Previous Section"
          targetSectionId={navigation.prevSectionId}
          currentSectionId={currentSectionId}
          lastBlockOrderToPersist={lastBlockOrderToPersist}
          isLocked={navigation.prevSectionLock?.isLocked}
        />

        <PlayerCompleteButton
          key={currentSectionId}
          sectionId={currentSectionId}
          hasQuizPanel={hasQuizPanel}
          pathId={pathId}
          moduleId={moduleId}
          initialSectionProgress={sectionProgress}
          onCompleted={onCompleted}
        />

        <PlayerNavButton
          direction="next"
          label="Next Section"
          targetSectionId={navigation.nextSectionId}
          currentSectionId={currentSectionId}
          lastBlockOrderToPersist={lastBlockOrderToPersist}
          isLocked={navigation.nextSectionLock?.isLocked}
        />
      </div>
      {footerLockReason ? <p className="playerNavLockReason playerActionRailLockReason">{footerLockReason}</p> : null}
    </footer>
  );
}
