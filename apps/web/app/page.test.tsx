import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getApiHealth, getContinueLearning, requireAuthSession, getStartLearningCandidate } = vi.hoisted(() => ({
  getApiHealth: vi.fn(),
  getContinueLearning: vi.fn(),
  requireAuthSession: vi.fn(),
  getStartLearningCandidate: vi.fn()
}));

vi.mock('@/src/lib/api', () => ({
  getApiHealth
}));

vi.mock('@/src/lib/api-clients/progress.server', () => ({
  getContinueLearning
}));

vi.mock('@/src/lib/auth/require-auth-session.server', () => ({
  requireAuthSession
}));

vi.mock('@/src/lib/onboarding/get-start-learning-candidate.server', () => ({
  getStartLearningCandidate
}));

import HomePage from './page';

describe('HomePage', () => {
  beforeEach(() => {
    getApiHealth.mockReset();
    getContinueLearning.mockReset();
    requireAuthSession.mockReset();
    getStartLearningCandidate.mockReset();

    requireAuthSession.mockResolvedValue({
      id: 'u1',
      email: 'student@academy.local',
      name: 'Student',
      role: 'user'
    });
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

    expect(requireAuthSession).toHaveBeenCalledWith('/');
    expect(screen.getByRole('link', { name: 'Resume section' })).toHaveAttribute('href', '/learn/s-resume');
    expect(screen.queryByRole('link', { name: 'Start your first section' })).not.toBeInTheDocument();
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

    expect(screen.getByRole('link', { name: 'Start your first section' })).toHaveAttribute('href', '/learn/s1');
    expect(screen.getByText('You are all set. Start your first section.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resume section' })).not.toBeInTheDocument();
  });

  it('renders fallback message when both continue and onboarding are unavailable', async () => {
    getContinueLearning.mockResolvedValue(null);
    getStartLearningCandidate.mockResolvedValue(null);

    render(await HomePage());

    expect(
      screen.getByText('Learning recommendations are temporarily unavailable.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Resume section' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Start your first section' })).not.toBeInTheDocument();
  });
});
