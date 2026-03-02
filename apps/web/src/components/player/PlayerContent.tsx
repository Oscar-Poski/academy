'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import type { SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress } from '@/src/lib/progress-types';
import type { QuizDelivery } from '@/src/lib/quiz-types';
import {
  formatSectionMeta,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/player/presentation';
import { LessonBlockRenderer } from './LessonBlockRenderer';
import { PlayerActionRail } from './PlayerActionRail';
import { PlayerLifecycleAnalytics } from './PlayerLifecycleAnalytics';
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
  const estimatedSeconds = renderableLessonBlocks.reduce(
    (total, block) => total + (block.estimatedSeconds ?? 0),
    0
  );
  const sectionMeta = formatSectionMeta({
    lessonBlockCount: renderableLessonBlocks.length,
    estimatedSeconds,
    completionPct: sectionProgress?.completionPct ?? null
  });

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
        <div className="playerHeaderMeta playerSectionMetaList">
          {sectionProgress ? (
            <span className={getSectionStatusClassName(sectionProgress.status)}>
              {getSectionStatusLabel(sectionProgress.status)}
            </span>
          ) : (
            <span className="playerHeaderMetaText">Progress indicators unavailable right now.</span>
          )}
          {sectionMeta.completionLabel ? (
            <span className="playerHeaderMetaText">{sectionMeta.completionLabel}</span>
          ) : null}
          <span className="playerMetaChip">{sectionMeta.lessonBlockLabel}</span>
          {sectionMeta.durationLabel ? <span className="playerMetaChip">{sectionMeta.durationLabel}</span> : null}
        </div>
      </header>

      <div className="playerReadFrame">
        <div className="playerReadingColumn">
          <div className="playerBlocks playerBlockStack">
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
        </div>

        <PlayerActionRail
          currentSectionId={currentSectionId}
          navigation={navigation}
          lastBlockOrderToPersist={lastBlockOrderToPersist}
          hasQuizPanel={Boolean(quizDelivery)}
          pathId={breadcrumb.pathId}
          moduleId={breadcrumb.moduleId}
          sectionProgress={sectionProgress}
          onCompleted={() => setIsCompleted(true)}
        />
      </div>
    </section>
  );
}
