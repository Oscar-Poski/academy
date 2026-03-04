import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePersonalizedStrip } from './HomePersonalizedStrip';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe('HomePersonalizedStrip', () => {
  it('renders continue learning state when resume data exists', () => {
    render(
      <HomePersonalizedStrip
        continueLearning={{
          source: 'resume',
          sectionId: 'section-1',
          moduleId: 'module-1',
          pathId: 'path-1',
          sectionTitle: 'Section One',
          moduleTitle: 'Module One',
          pathTitle: 'Path One',
          lastSeenAt: null
        }}
        startLearningCandidate={null}
      />
    );

    expect(screen.getByRole('heading', { name: 'Continúa aprendiendo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retomar sección' })).toHaveAttribute('href', '/learn/section-1');
    expect(screen.queryByRole('link', { name: 'Comenzar mi primera sección' })).not.toBeInTheDocument();
  });

  it('renders onboarding state when no continue-learning data is available', () => {
    render(
      <HomePersonalizedStrip
        continueLearning={null}
        startLearningCandidate={{
          pathId: 'path-1',
          pathTitle: 'Path One',
          moduleId: 'module-1',
          moduleTitle: 'Module One',
          sectionId: 'section-2',
          sectionTitle: 'Section Two'
        }}
      />
    );

    expect(screen.getByText('Todo está listo. Comienza tu primera sección.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comenzar mi primera sección' })).toHaveAttribute('href', '/learn/section-2');
    expect(screen.queryByRole('link', { name: 'Retomar sección' })).not.toBeInTheDocument();
  });

  it('renders fallback notice when no personalized recommendation exists', () => {
    render(<HomePersonalizedStrip continueLearning={null} startLearningCandidate={null} />);

    const notice = screen.getByText('Las recomendaciones de aprendizaje no están disponibles por el momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
  });
});
