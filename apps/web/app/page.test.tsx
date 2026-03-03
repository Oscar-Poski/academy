import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getApiHealth, getContinueLearning, getStartLearningCandidate } = vi.hoisted(() => ({
  getApiHealth: vi.fn(),
  getContinueLearning: vi.fn(),
  getStartLearningCandidate: vi.fn()
}));

vi.mock('@/src/lib/api', () => ({
  getApiHealth
}));

vi.mock('@/src/lib/api-clients/progress.server', () => ({
  getContinueLearning
}));

vi.mock('@/src/lib/onboarding/get-start-learning-candidate.server', () => ({
  getStartLearningCandidate
}));

import HomePage from './page';

describe('HomePage', () => {
  beforeEach(() => {
    getApiHealth.mockReset();
    getContinueLearning.mockReset();
    getStartLearningCandidate.mockReset();
    getApiHealth.mockResolvedValue({ status: 'ok' });
    getContinueLearning.mockResolvedValue(null);
    getStartLearningCandidate.mockResolvedValue(null);
  });

  it('renders continue state when continue-learning exists', async () => {
    getContinueLearning.mockResolvedValue({
      sectionId: 's-resume',
      sectionTitle: 'HTTP Status Codes',
      moduleTitle: 'HTTP Basics',
      pathTitle: 'Web Foundations',
      source: 'resume'
    });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Retomar sección' })).toHaveAttribute('href', '/learn/s-resume');
    expect(screen.queryByRole('link', { name: 'Comenzar mi primera sección' })).not.toBeInTheDocument();
  });

  it('renders onboarding state when continue-learning is empty and candidate exists', async () => {
    getStartLearningCandidate.mockResolvedValue({
      pathId: 'p1',
      pathTitle: 'Path One',
      moduleId: 'm1',
      moduleTitle: 'Module One',
      sectionId: 's1',
      sectionTitle: 'Section One'
    });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Comenzar mi primera sección' })).toHaveAttribute('href', '/learn/s1');
    expect(screen.getByText('Todo está listo. Comienza tu primera sección.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Retomar sección' })).not.toBeInTheDocument();
  });

  it('renders fallback message when both continue and onboarding are unavailable', async () => {
    getContinueLearning.mockResolvedValue(null);
    getStartLearningCandidate.mockResolvedValue(null);

    render(await HomePage());

    const notice = screen.getByText('Las recomendaciones de aprendizaje no están disponibles por el momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
    expect(screen.queryByRole('link', { name: 'Retomar sección' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comenzar mi primera sección' })).not.toBeInTheDocument();
  });
});
