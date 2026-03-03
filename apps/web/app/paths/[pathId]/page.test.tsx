import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPath, getPathProgress, getSessionProfile, notFound } = vi.hoisted(() => ({
  getPath: vi.fn(),
  getPathProgress: vi.fn(),
  getSessionProfile: vi.fn(),
  notFound: vi.fn()
}));

vi.mock('@/src/lib/api-clients/content.client', () => ({
  getPath,
  ContentApiError: class ContentApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`content error ${status}`);
      this.status = status;
    }
  }
}));

vi.mock('@/src/lib/api-clients/progress.server', () => ({
  getPathProgress
}));

vi.mock('@/src/lib/auth/get-session-profile.server', () => ({
  getSessionProfile
}));

vi.mock('next/navigation', () => ({
  notFound
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

import PathPage from './page';

describe('PathPage', () => {
  beforeEach(() => {
    getPath.mockReset();
    getPathProgress.mockReset();
    getSessionProfile.mockReset();
    notFound.mockReset();
    getSessionProfile.mockResolvedValue({ authenticated: true });
  });

  it('renders module cards with progress chips when progress exists', async () => {
    getPath.mockResolvedValue({
      id: 'path-1',
      slug: 'web-foundations',
      title: 'Web Foundations',
      description: 'Start here',
      modules: [
        {
          id: 'module-1',
          slug: 'http-basics',
          title: 'HTTP Basics',
          sortOrder: 1,
          sections: [{ id: 'section-1', slug: 'intro', title: 'Intro', sortOrder: 1 }]
        },
        {
          id: 'module-2',
          slug: 'rest-apis',
          title: 'REST APIs',
          sortOrder: 2,
          lock: {
            isLocked: true,
            reasons: ['Pass prerequisite quiz'],
            requiresCredits: false,
            creditsCost: 0
          },
          sections: [{ id: 'section-2', slug: 'verbs', title: 'Verbs', sortOrder: 1 }]
        }
      ]
    });
    getPathProgress.mockResolvedValue({
      pathId: 'path-1',
      completionPct: 30,
      completedModules: 0,
      totalModules: 2,
      modules: [
        { moduleId: 'module-1', completionPct: 40, completedSections: 1, totalSections: 2 },
        { moduleId: 'module-2', completionPct: 0, completedSections: 0, totalSections: 1 }
      ]
    });

    render(await PathPage({ params: { pathId: 'path-1' } }));

    expect(screen.getByRole('heading', { name: 'Web Foundations' })).toBeInTheDocument();
    expect(screen.getByText('40% · 1/2 secciones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir módulo' })).toHaveAttribute('href', '/modules/module-1');
    expect(screen.getByText('Pass prerequisite quiz')).toBeInTheDocument();
    expect(screen.queryAllByRole('link', { name: 'Abrir módulo' })).toHaveLength(1);
  });

  it('keeps a non-fatal notice when progress is unavailable', async () => {
    getPath.mockResolvedValue({
      id: 'path-1',
      slug: 'web-foundations',
      title: 'Web Foundations',
      description: null,
      modules: []
    });
    getPathProgress.mockRejectedValue(new Error('progress down'));

    render(await PathPage({ params: { pathId: 'path-1' } }));

    const notice = screen.getByText('Los indicadores de progreso no están disponibles en este momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
  });

  it('renders anonymous auth prompt and login-first section CTA', async () => {
    getSessionProfile.mockResolvedValue({ authenticated: false });
    getPath.mockResolvedValue({
      id: 'path-1',
      slug: 'web-foundations',
      title: 'Web Foundations',
      description: null,
      modules: [
        {
          id: 'module-1',
          slug: 'http-basics',
          title: 'HTTP Basics',
          sortOrder: 1,
          sections: [{ id: 'section-1', slug: 'intro', title: 'Intro', sortOrder: 1 }]
        }
      ]
    });
    getPathProgress.mockRejectedValue(new Error('progress down'));

    render(await PathPage({ params: { pathId: 'path-1' } }));

    expect(screen.getByText('Inicia sesión para guardar tu progreso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login?next=/paths/path-1');
    expect(screen.getByRole('link', { name: 'Iniciar sesión para comenzar' })).toHaveAttribute(
      'href',
      '/login?next=/learn/section-1'
    );
    expect(screen.queryByText('Los indicadores de progreso no están disponibles en este momento.')).not.toBeInTheDocument();
  });
});
