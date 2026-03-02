import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireAuthSession,
  getSection,
  getModule,
  getPath,
  startSectionProgress,
  getQuizDelivery,
  postAnalyticsEvent,
  notFound,
  playerLayoutMock
} = vi.hoisted(() => ({
  requireAuthSession: vi.fn(),
  getSection: vi.fn(),
  getModule: vi.fn(),
  getPath: vi.fn(),
  startSectionProgress: vi.fn(),
  getQuizDelivery: vi.fn(),
  postAnalyticsEvent: vi.fn(),
  notFound: vi.fn(),
  playerLayoutMock: vi.fn()
}));

vi.mock('next/navigation', () => ({
  notFound
}));

vi.mock('@/src/lib/auth/require-auth-session.server', () => ({
  requireAuthSession
}));

vi.mock('@/src/lib/api-clients/content.client', async () => {
  const actual = await vi.importActual<typeof import('@/src/lib/api-clients/content.client')>(
    '@/src/lib/api-clients/content.client'
  );

  return {
    ...actual,
    getSection,
    getModule,
    getPath
  };
});

vi.mock('@/src/lib/api-clients/progress.server', () => ({
  startSectionProgress
}));

vi.mock('@/src/lib/api-clients/quiz.server', () => ({
  getQuizDelivery
}));

vi.mock('@/src/lib/api-clients/analytics.server', () => ({
  postAnalyticsEvent
}));

vi.mock('@/src/components/player/PlayerLayout', () => ({
  PlayerLayout: (props: unknown) => {
    playerLayoutMock(props);
    return <div data-testid="player-layout" />;
  }
}));

import LearnPage from './page';

describe('LearnPage', () => {
  beforeEach(() => {
    requireAuthSession.mockReset();
    getSection.mockReset();
    getModule.mockReset();
    getPath.mockReset();
    startSectionProgress.mockReset();
    getQuizDelivery.mockReset();
    postAnalyticsEvent.mockReset();
    notFound.mockReset();
    playerLayoutMock.mockReset();

    requireAuthSession.mockResolvedValue({
      id: 'user-1',
      email: 'student@academy.local',
      name: 'Student',
      role: 'user'
    });

    getSection.mockResolvedValue({
      id: 'section-1',
      moduleId: 'module-1',
      slug: 'request-response-cycle',
      title: 'Request/Response Cycle',
      sortOrder: 1,
      sectionVersionId: 'version-1',
      lessonBlocks: [],
      navigation: {
        prevSectionId: null,
        nextSectionId: null,
        prevSectionLock: null,
        nextSectionLock: null
      }
    });

    getModule.mockResolvedValue({
      id: 'module-1',
      pathId: 'path-1',
      slug: 'http-basics',
      title: 'HTTP Basics',
      description: null,
      sortOrder: 1,
      sections: []
    });

    getPath.mockResolvedValue({
      id: 'path-1',
      slug: 'web-foundations',
      title: 'Web Foundations',
      description: null,
      modules: []
    });

    startSectionProgress.mockResolvedValue({
      id: 'progress-1',
      userId: 'user-1',
      sectionId: 'section-1',
      sectionVersionId: 'version-1',
      status: 'in_progress',
      startedAt: null,
      lastSeenAt: null,
      completedAt: null,
      completionPct: 0,
      lastBlockOrder: null,
      timeSpentSeconds: 0
    });

    getQuizDelivery.mockResolvedValue({
      sectionId: 'section-1',
      sectionVersionId: 'version-1',
      questions: []
    });

    postAnalyticsEvent.mockResolvedValue(undefined);
  });

  it('renders player layout for authenticated learner with progress and quiz delivery', async () => {
    render(await LearnPage({ params: { sectionId: 'section-1' } }));

    expect(requireAuthSession).toHaveBeenCalledWith('/learn/section-1');
    expect(getSection).toHaveBeenCalledWith('section-1', { includeUserContext: true });
    expect(getModule).toHaveBeenCalledWith('module-1', { includeUserContext: true });
    expect(getPath).toHaveBeenCalledWith('path-1', { includeUserContext: true });
    expect(screen.getByTestId('player-layout')).toBeInTheDocument();

    const props = playerLayoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.currentSectionId).toBe('section-1');
    expect(props.currentModuleId).toBe('module-1');
    expect(props.sectionProgress).toMatchObject({ id: 'progress-1' });
    expect(props.quizDelivery).toMatchObject({ sectionId: 'section-1' });

    expect(postAnalyticsEvent).toHaveBeenCalledTimes(1);
    expect(postAnalyticsEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'section_start',
        user_id: 'user-1',
        path_id: 'path-1',
        module_id: 'module-1',
        section_id: 'section-1',
        section_version_id: 'version-1',
        payload_json: { source: 'learn_page' }
      })
    );
  });

  it('keeps rendering when quiz delivery resolves to null (404 mapped)', async () => {
    getQuizDelivery.mockResolvedValue(null);

    render(await LearnPage({ params: { sectionId: 'section-1' } }));

    const props = playerLayoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.quizDelivery).toBeNull();
    expect(screen.getByTestId('player-layout')).toBeInTheDocument();
  });

  it('keeps rendering when progress start fails and skips section_start analytics', async () => {
    startSectionProgress.mockRejectedValue(new Error('progress unavailable'));

    render(await LearnPage({ params: { sectionId: 'section-1' } }));

    const props = playerLayoutMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(props.sectionProgress).toBeNull();
    expect(postAnalyticsEvent).not.toHaveBeenCalled();
  });

  it('calls notFound for missing section and rethrows content error', async () => {
    const { ContentApiError } = await import('@/src/lib/api-clients/content.client');
    getSection.mockRejectedValue(new ContentApiError('Missing section', 404));

    await expect(LearnPage({ params: { sectionId: 'missing' } })).rejects.toBeInstanceOf(ContentApiError);
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
