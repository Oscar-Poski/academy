'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import type { SectionLessonBlock, SectionNavigation } from '@/src/lib/content-types';
import type { SectionProgress } from '@/src/lib/progress-types';
import type { QuizDelivery } from '@/src/lib/quiz-types';
import { microcopy } from '@/src/lib/copy/microcopy';
import {
  formatSectionMeta,
  getSectionStatusClassName,
  getSectionStatusLabel
} from '@/src/lib/player/presentation';
import { InlineNotice } from '@/src/components/state';
import { Card } from '@/src/components/ui';
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
      <Card as="header" className="playerHeader playerCard" padding="none">
        <nav className="playerBreadcrumb" aria-label="Breadcrumb">
          <ol className="playerBreadcrumbList">
            <li className="playerBreadcrumbItem">
              <Link href={`/paths/${breadcrumb.pathId}`}>{breadcrumb.pathTitle}</Link>
            </li>
            <li className="playerBreadcrumbItem">
              <Link href={`/modules/${breadcrumb.moduleId}`}>{breadcrumb.moduleTitle}</Link>
            </li>
            <li className="playerBreadcrumbItem" aria-current="page">
              <span>{breadcrumb.sectionTitle}</span>
            </li>
          </ol>
        </nav>
        <h1 className="playerSectionTitle">{breadcrumb.sectionTitle}</h1>
        <div className="playerHeaderMeta playerSectionMetaList">
          {sectionProgress ? (
            <span className={getSectionStatusClassName(sectionProgress.status)}>
              {getSectionStatusLabel(sectionProgress.status)}
            </span>
          ) : (
            <InlineNotice className="playerHeaderMetaText" message={microcopy.player.progressUnavailable} />
          )}
          {sectionMeta.completionLabel ? (
            <span className="playerHeaderMetaText">{sectionMeta.completionLabel}</span>
          ) : null}
          <span className="playerMetaChip">{sectionMeta.lessonBlockLabel}</span>
          {sectionMeta.durationLabel ? <span className="playerMetaChip">{sectionMeta.durationLabel}</span> : null}
        </div>
      </Card>

      <div className="playerReadFrame">
        <div className="playerReadingColumn">
          <div className="playerBlocks playerBlockStack">
            {renderableLessonBlocks.length === 0 && !hasQuizBlockOnly ? (
              <InlineNotice className="playerCard playerEmptyState" message={microcopy.player.noLessonBlocks} />
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
