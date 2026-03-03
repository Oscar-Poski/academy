import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getModule, getModuleProgress, getSessionProfile, notFound } = vi.hoisted(() => ({
  getModule: vi.fn(),
  getModuleProgress: vi.fn(),
  getSessionProfile: vi.fn(),
  notFound: vi.fn()
}));

vi.mock('@/src/lib/api-clients/content.client', () => ({
  getModule,
  ContentApiError: class ContentApiError extends Error {
    status: number;

    constructor(status: number) {
      super(`content error ${status}`);
      this.status = status;
    }
  }
}));

vi.mock('@/src/lib/api-clients/progress.server', () => ({
  getModuleProgress
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

import ModulePage from './page';

describe('ModulePage', () => {
  beforeEach(() => {
    getModule.mockReset();
    getModuleProgress.mockReset();
    getSessionProfile.mockReset();
    notFound.mockReset();
    getSessionProfile.mockResolvedValue({ authenticated: true });
  });

  it('renders section rows with status chips and CTA hierarchy', async () => {
    getModule.mockResolvedValue({
      id: 'module-1',
      pathId: 'path-1',
      slug: 'http-basics',
      title: 'HTTP Basics',
      description: 'Foundational module',
      sortOrder: 1,
      sections: [
        { id: 'section-1', slug: 'intro', title: 'Intro', sortOrder: 1 },
        { id: 'section-2', slug: 'verbs', title: 'HTTP Verbs', sortOrder: 2 },
        { id: 'section-3', slug: 'status', title: 'Status Codes', sortOrder: 3 }
      ]
    });
    getModuleProgress.mockResolvedValue({
      moduleId: 'module-1',
      completionPct: 50,
      completedSections: 1,
      totalSections: 3,
      sections: [
        {
          sectionId: 'section-1',
          status: 'not_started',
          completionPct: 0,
          lastBlockOrder: null,
          lastSeenAt: null,
          completedAt: null,
          sectionVersionId: null
        },
        {
          sectionId: 'section-2',
          status: 'in_progress',
          completionPct: 42,
          lastBlockOrder: 2,
          lastSeenAt: null,
          completedAt: null,
          sectionVersionId: 'version-1'
        },
        {
          sectionId: 'section-3',
          status: 'completed',
          completionPct: 100,
          lastBlockOrder: 5,
          lastSeenAt: null,
          completedAt: null,
          sectionVersionId: 'version-2'
        }
      ]
    });

    render(await ModulePage({ params: { moduleId: 'module-1' } }));

    expect(screen.getByText('Sin comenzar')).toBeInTheDocument();
    expect(screen.getByText('En progreso')).toBeInTheDocument();
    expect(screen.getByText('Completada')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comenzar' })).toHaveAttribute('href', '/learn/section-1');
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/learn/section-2');
    expect(screen.getByRole('link', { name: 'Repasar' })).toHaveAttribute('href', '/learn/section-3');
  });

  it('renders locked section with concise lock notice and disabled action', async () => {
    getModule.mockResolvedValue({
      id: 'module-1',
      pathId: 'path-1',
      slug: 'http-basics',
      title: 'HTTP Basics',
      description: null,
      sortOrder: 1,
      sections: [
        {
          id: 'section-locked',
          slug: 'advanced',
          title: 'Advanced Topic',
          sortOrder: 1,
          lock: {
            isLocked: true,
            reasons: ['Complete prior section'],
            requiresCredits: false,
            creditsCost: 0
          }
        }
      ]
    });
    getModuleProgress.mockResolvedValue({
      moduleId: 'module-1',
      completionPct: 0,
      completedSections: 0,
      totalSections: 1,
      sections: []
    });

    render(await ModulePage({ params: { moduleId: 'module-1' } }));

    expect(screen.getByText('Complete prior section')).toBeInTheDocument();
    const lockedAction = screen.getAllByText('Bloqueado').find((node) =>
      node.classList.contains('catalogPrimaryCta')
    );
    expect(lockedAction).toBeDefined();
    expect(lockedAction).toHaveClass('isDisabled');
  });

  it('keeps non-fatal notice when module progress is unavailable', async () => {
    getModule.mockResolvedValue({
      id: 'module-1',
      pathId: 'path-1',
      slug: 'http-basics',
      title: 'HTTP Basics',
      description: null,
      sortOrder: 1,
      sections: []
    });
    getModuleProgress.mockRejectedValue(new Error('progress down'));

    render(await ModulePage({ params: { moduleId: 'module-1' } }));

    const notice = screen.getByText('Los indicadores de progreso no están disponibles en este momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
  });

  it('renders anonymous auth prompt and login-first section actions', async () => {
    getSessionProfile.mockResolvedValue({ authenticated: false });
    getModule.mockResolvedValue({
      id: 'module-1',
      pathId: 'path-1',
      slug: 'http-basics',
      title: 'HTTP Basics',
      description: 'Foundational module',
      sortOrder: 1,
      sections: [{ id: 'section-1', slug: 'intro', title: 'Intro', sortOrder: 1 }]
    });
    getModuleProgress.mockRejectedValue(new Error('progress down'));

    render(await ModulePage({ params: { moduleId: 'module-1' } }));

    expect(screen.getByText('Inicia sesión para guardar tu progreso.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute(
      'href',
      '/login?next=/modules/module-1'
    );
    expect(screen.getByRole('link', { name: 'Iniciar sesión para comenzar' })).toHaveAttribute(
      'href',
      '/login?next=/learn/section-1'
    );
    expect(screen.queryByText('Los indicadores de progreso no están disponibles en este momento.')).not.toBeInTheDocument();
  });
});
