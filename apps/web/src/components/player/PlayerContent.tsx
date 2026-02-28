'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress, SectionProgressStatus } from '@/src/lib/progress-types';
import type { QuizDelivery } from '@/src/lib/quiz-types';
import { LessonBlockRenderer } from './LessonBlockRenderer';
import { PlayerCompleteButton } from './PlayerCompleteButton';
import { PlayerLifecycleAnalytics } from './PlayerLifecycleAnalytics';
import { PlayerNavButton } from './PlayerNavButton';
import { QuizPanel } from './quiz/QuizPanel';

type Breadcrumb = {
  pathId: string;
  pathTitle: string;
  moduleId: string;
  moduleTitle: string;
  sectionTitle: string;
};

type PlayerContentProps = {
  currentSectionId: string;
  breadcrumb: Breadcrumb;
  lessonBlocks: SectionLessonBlock[];
  navigation: SectionNavigation;
  sectionProgress?: SectionProgress | null;
  quizDelivery?: QuizDelivery | null;
};

function getStatusLabel(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'not_started':
    default:
      return 'Not Started';
  }
}

function getStatusClassName(status: SectionProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'progressBadge progressBadge--completed';
    case 'in_progress':
      return 'progressBadge progressBadge--inProgress';
    case 'not_started':
    default:
      return 'progressBadge progressBadge--notStarted';
  }
}

export function PlayerContent({
  currentSectionId,
  breadcrumb,
  lessonBlocks,
  navigation,
  sectionProgress,
  quizDelivery
}: PlayerContentProps) {
  const [isCompleted, setIsCompleted] = useState(sectionProgress?.status === 'completed');
  const renderableLessonBlocks = lessonBlocks.filter((block) => block.blockType !== 'quiz');
  const hasQuizBlockOnly =
    lessonBlocks.length > 0 && renderableLessonBlocks.length === 0 && lessonBlocks.some((b) => b.blockType === 'quiz');
  const lastBlockOrderToPersist =
    lessonBlocks.length > 0 ? Math.max(...lessonBlocks.map((block) => block.blockOrder)) : 0;
  const prevLockReason = navigation.prevSectionLock?.reasons[0] ?? null;
  const nextLockReason = navigation.nextSectionLock?.reasons[0] ?? null;
  const footerLockReason =
    (navigation.nextSectionLock?.isLocked ? nextLockReason : null) ??
    (navigation.prevSectionLock?.isLocked ? prevLockReason : null);

  return (
    <section className="playerContent">
      {sectionProgress ? (
        <PlayerLifecycleAnalytics
          userId={sectionProgress.userId}
          pathId={breadcrumb.pathId}
          moduleId={breadcrumb.moduleId}
          sectionId={currentSectionId}
          sectionVersionId={sectionProgress.sectionVersionId}
          sessionKey={sectionProgress.id}
          isCompleted={isCompleted}
        />
      ) : null}
      <header className="playerHeader playerCard">
        <nav className="playerBreadcrumb" aria-label="Breadcrumb">
          <Link href={`/paths/${breadcrumb.pathId}`}>{breadcrumb.pathTitle}</Link>
          <span className="playerBreadcrumbSep">/</span>
          <Link href={`/modules/${breadcrumb.moduleId}`}>{breadcrumb.moduleTitle}</Link>
          <span className="playerBreadcrumbSep">/</span>
          <span aria-current="page">{breadcrumb.sectionTitle}</span>
        </nav>
        <h1 className="playerSectionTitle">{breadcrumb.sectionTitle}</h1>
        {sectionProgress ? (
          <div className="playerHeaderMeta">
            <span className={getStatusClassName(sectionProgress.status)}>
              {getStatusLabel(sectionProgress.status)}
            </span>
            <span className="playerHeaderMetaText">{sectionProgress.completionPct}% complete</span>
          </div>
        ) : null}
      </header>

      <div className="playerBlocks">
        {renderableLessonBlocks.length === 0 && !hasQuizBlockOnly ? (
          <div className="playerCard playerEmptyState">No lesson blocks available for this section yet.</div>
        ) : (
          renderableLessonBlocks.map((block) => (
            <div key={block.id} className="playerBlockItem">
              <LessonBlockRenderer block={block} />
            </div>
          ))
        )}
      </div>

      {quizDelivery ? <QuizPanel sectionId={currentSectionId} quizDelivery={quizDelivery} /> : null}

      <footer className="playerFooter playerCard">
        <PlayerNavButton
          direction="prev"
          label="Previous Section"
          targetSectionId={navigation.prevSectionId}
          currentSectionId={currentSectionId}
          lastBlockOrderToPersist={lastBlockOrderToPersist}
          isLocked={navigation.prevSectionLock?.isLocked}
          lockReason={prevLockReason}
        />

        <PlayerCompleteButton
          key={currentSectionId}
          sectionId={currentSectionId}
          hasQuizPanel={Boolean(quizDelivery)}
          pathId={breadcrumb.pathId}
          moduleId={breadcrumb.moduleId}
          initialSectionProgress={sectionProgress}
          onCompleted={() => setIsCompleted(true)}
        />

        <PlayerNavButton
          direction="next"
          label="Next Section"
          targetSectionId={navigation.nextSectionId}
          currentSectionId={currentSectionId}
          lastBlockOrderToPersist={lastBlockOrderToPersist}
          isLocked={navigation.nextSectionLock?.isLocked}
          lockReason={nextLockReason}
        />
        {footerLockReason ? <p className="playerNavLockReason">{footerLockReason}</p> : null}
      </footer>
    </section>
  );
}
