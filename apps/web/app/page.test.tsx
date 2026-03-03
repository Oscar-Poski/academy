import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionProfile, getPaths, getContinueLearning, getStartLearningCandidate } = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  getPaths: vi.fn(),
  getContinueLearning: vi.fn(),
  getStartLearningCandidate: vi.fn()
}));

vi.mock('@/src/lib/auth/get-session-profile.server', () => ({
  getSessionProfile
}));

vi.mock('@/src/lib/api-clients/content.client', () => ({
  getPaths
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
    getSessionProfile.mockReset();
    getPaths.mockReset();
    getContinueLearning.mockReset();
    getStartLearningCandidate.mockReset();
    getSessionProfile.mockResolvedValue({ authenticated: false });
    getPaths.mockResolvedValue([]);
    getContinueLearning.mockResolvedValue(null);
    getStartLearningCandidate.mockResolvedValue(null);
  });

  it('renders hero and featured courses for anonymous users', async () => {
    getPaths.mockResolvedValue([
      {
        id: 'path-1',
        slug: 'web-foundations',
        title: 'Web Foundations',
        description: 'Base path',
        moduleCount: 1,
        sectionCount: 2
      }
    ]);

    render(await HomePage());

    expect(screen.getByRole('heading', { name: 'Cursos destacados' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar cursos' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('heading', { name: 'Web Foundations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ruta' })).toHaveAttribute('href', '/paths/path-1');
    expect(getContinueLearning).not.toHaveBeenCalled();
    expect(getStartLearningCandidate).not.toHaveBeenCalled();
  });

  it('renders personalized continue state for authenticated users', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user'
      }
    });
    getContinueLearning.mockResolvedValue({
      sectionId: 's-resume',
      sectionTitle: 'HTTP Status Codes',
      moduleTitle: 'HTTP Basics',
      pathTitle: 'Web Foundations',
      source: 'resume'
    });

    render(await HomePage());

    expect(screen.getByRole('link', { name: 'Retomar sección' })).toHaveAttribute('href', '/learn/s-resume');
    expect(screen.getByRole('link', { name: 'Ir a mi inicio' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: 'Comenzar mi primera sección' })).not.toBeInTheDocument();
  });

  it('renders onboarding state when continue-learning is empty and candidate exists', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user'
      }
    });
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
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'user-1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user'
      }
    });
    getContinueLearning.mockResolvedValue(null);
    getStartLearningCandidate.mockResolvedValue(null);

    render(await HomePage());

    const notice = screen.getByText('Las recomendaciones de aprendizaje no están disponibles por el momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
    expect(screen.queryByRole('link', { name: 'Retomar sección' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Comenzar mi primera sección' })).not.toBeInTheDocument();
  });

  it('shows featured unavailable notice when public courses fetch fails', async () => {
    getPaths.mockRejectedValue(new Error('catalog down'));

    render(await HomePage());

    expect(screen.getByText('No pudimos cargar los cursos destacados en este momento.')).toBeInTheDocument();
  });
});
