import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuizDelivery } from '@/src/lib/quiz-types';
import { PlayerContent } from './PlayerContent';

const { playerActionRailSpy } = vi.hoisted(() => ({
  playerActionRailSpy: vi.fn()
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

vi.mock('./LessonBlockRenderer', () => ({
  LessonBlockRenderer: ({ block }: { block: { id: string } }) => <div data-testid={`block-${block.id}`} />
}));

vi.mock('./PlayerLifecycleAnalytics', () => ({
  PlayerLifecycleAnalytics: () => <div data-testid="lifecycle-analytics" />
}));

vi.mock('./PlayerActionRail', () => ({
  PlayerActionRail: (props: { currentSectionId: string; hasQuizPanel: boolean }) => {
    playerActionRailSpy(props);
    return <div data-testid="player-action-rail" />;
  }
}));

vi.mock('./quiz/QuizPanel', () => ({
  QuizPanel: ({ sectionId }: { sectionId: string }) => <div data-testid={`quiz-panel-${sectionId}`} />
}));

describe('PlayerContent', () => {
  beforeEach(() => {
    playerActionRailSpy.mockReset();
  });

  const breadcrumb = {
    pathId: 'path-1',
    pathTitle: 'Web Foundations',
    moduleId: 'module-1',
    moduleTitle: 'HTTP Basics',
    sectionTitle: 'Request Response Cycle'
  };

  const navigation = {
    prevSectionId: 'section-0',
    nextSectionId: 'section-2',
    prevSectionLock: null,
    nextSectionLock: null
  };

  const quizDelivery: QuizDelivery = {
    sectionId: 'section-1',
    sectionVersionId: 'version-1',
    questions: []
  };

  it('renders ordered metadata and readable frame with progress present', () => {
    const { container } = render(
      <PlayerContent
        currentSectionId="section-1"
        breadcrumb={breadcrumb}
        lessonBlocks={[
          {
            id: 'block-1',
            blockOrder: 1,
            blockType: 'markdown',
            contentJson: {},
            estimatedSeconds: 120
          },
          {
            id: 'block-2',
            blockOrder: 2,
            blockType: 'callout',
            contentJson: {},
            estimatedSeconds: 90
          },
          {
            id: 'block-quiz',
            blockOrder: 3,
            blockType: 'quiz',
            contentJson: {},
            estimatedSeconds: null
          }
        ]}
        navigation={navigation}
        sectionProgress={{
          id: 'progress-1',
          userId: 'user-1',
          sectionId: 'section-1',
          sectionVersionId: 'version-1',
          status: 'in_progress',
          startedAt: null,
          lastSeenAt: null,
          completedAt: null,
          completionPct: 55,
          lastBlockOrder: 2,
          timeSpentSeconds: 120
        }}
        quizDelivery={quizDelivery}
      />
    );

    const metaItems = Array.from(container.querySelectorAll('.playerSectionMetaList > *')).map((item) =>
      item.textContent?.trim()
    );
    expect(metaItems).toEqual(['In Progress', '55% complete', '2 blocks', '4 min read']);
    expect(container.querySelector('.playerReadFrame')).toBeInTheDocument();
    expect(container.querySelector('.playerReadingColumn')).toBeInTheDocument();
    expect(screen.getByTestId('lifecycle-analytics')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-panel-section-1')).toBeInTheDocument();
    expect(playerActionRailSpy.mock.calls[0][0]).toMatchObject({
      currentSectionId: 'section-1',
      hasQuizPanel: true
    });
  });

  it('keeps non-fatal fallback when progress is missing', () => {
    render(
      <PlayerContent
        currentSectionId="section-1"
        breadcrumb={breadcrumb}
        lessonBlocks={[
          {
            id: 'block-1',
            blockOrder: 1,
            blockType: 'markdown',
            contentJson: {},
            estimatedSeconds: 60
          }
        ]}
        navigation={navigation}
        sectionProgress={null}
        quizDelivery={null}
      />
    );

    expect(screen.getByText('Progress indicators unavailable right now.')).toBeInTheDocument();
    expect(screen.queryByTestId('lifecycle-analytics')).not.toBeInTheDocument();
    expect(playerActionRailSpy.mock.calls[0][0]).toMatchObject({
      currentSectionId: 'section-1',
      hasQuizPanel: false
    });
  });
});
