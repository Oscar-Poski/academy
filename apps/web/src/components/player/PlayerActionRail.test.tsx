import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerActionRail } from './PlayerActionRail';

const { playerNavButtonSpy, playerCompleteButtonSpy } = vi.hoisted(() => ({
  playerNavButtonSpy: vi.fn(),
  playerCompleteButtonSpy: vi.fn()
}));

vi.mock('./PlayerNavButton', () => ({
  PlayerNavButton: (props: {
    direction: 'prev' | 'next';
    label: string;
    targetSectionId: string | null;
    isLocked?: boolean;
  }) => {
    playerNavButtonSpy(props);
    return (
      <div data-testid={`nav-${props.direction}`}>
        {props.label}
      </div>
    );
  }
}));

vi.mock('./PlayerCompleteButton', () => ({
  PlayerCompleteButton: (props: { sectionId: string }) => {
    playerCompleteButtonSpy(props);
    return <div data-testid="complete-button">Marcar como completada</div>;
  }
}));

describe('PlayerActionRail', () => {
  beforeEach(() => {
    playerNavButtonSpy.mockReset();
    playerCompleteButtonSpy.mockReset();
  });

  it('renders previous/complete/next controls and next lock reason', () => {
    render(
      <PlayerActionRail
        currentSectionId="section-2"
        navigation={{
          prevSectionId: 'section-1',
          nextSectionId: 'section-3',
          prevSectionLock: null,
          nextSectionLock: {
            isLocked: true,
            reasons: ['Pass quiz to continue'],
            requiresCredits: false,
            creditsCost: 0
          }
        }}
        lastBlockOrderToPersist={4}
        hasQuizPanel
        pathId="path-1"
        moduleId="module-1"
      />
    );

    expect(screen.getByTestId('nav-prev')).toHaveTextContent('Sección anterior');
    expect(screen.getByTestId('complete-button')).toBeInTheDocument();
    expect(screen.getByTestId('nav-next')).toHaveTextContent('Sección siguiente');
    expect(screen.getByText('Pass quiz to continue')).toBeInTheDocument();
    expect(playerNavButtonSpy).toHaveBeenCalledTimes(2);
    expect(playerCompleteButtonSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to previous lock reason when next is unlocked', () => {
    render(
      <PlayerActionRail
        currentSectionId="section-2"
        navigation={{
          prevSectionId: 'section-1',
          nextSectionId: 'section-3',
          prevSectionLock: {
            isLocked: true,
            reasons: ['Finish previous prerequisite'],
            requiresCredits: false,
            creditsCost: 0
          },
          nextSectionLock: {
            isLocked: false,
            reasons: ['Not used'],
            requiresCredits: false,
            creditsCost: 0
          }
        }}
        lastBlockOrderToPersist={1}
        hasQuizPanel={false}
        pathId="path-1"
        moduleId="module-1"
      />
    );

    expect(screen.getByText('Finish previous prerequisite')).toBeInTheDocument();
  });
});
