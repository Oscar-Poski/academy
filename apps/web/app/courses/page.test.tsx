import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getPaths, getPath } = vi.hoisted(() => ({
  getPaths: vi.fn(),
  getPath: vi.fn()
}));

vi.mock('@/src/lib/api-clients/content.client', () => ({
  getPaths,
  getPath
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

import CoursesPage from './page';

describe('CoursesPage', () => {
  beforeEach(() => {
    getPaths.mockReset();
    getPath.mockReset();
  });

  it('renders title/subtitle and course cards with computed counts', async () => {
    getPaths.mockResolvedValue([
      {
        id: 'path-1',
        slug: 'web-foundations',
        title: 'Web Foundations',
        description: 'Base path',
        moduleCount: 0,
        sectionCount: 0
      }
    ]);
    getPath.mockResolvedValue({
      id: 'path-1',
      slug: 'web-foundations',
      title: 'Web Foundations',
      description: 'Base path',
      modules: [
        {
          id: 'module-1',
          slug: 'http',
          title: 'HTTP',
          sortOrder: 1,
          sections: [
            { id: 's1', slug: 'intro', title: 'Intro', sortOrder: 1 },
            { id: 's2', slug: 'verbs', title: 'Verbs', sortOrder: 2 }
          ]
        }
      ]
    });

    render(await CoursesPage());

    expect(screen.getByRole('heading', { name: 'Cursos disponibles' })).toBeInTheDocument();
    expect(screen.getByText('Explora rutas públicas y entra a la que quieras comenzar.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Web Foundations' })).toBeInTheDocument();
    expect(screen.getByText('1 módulos')).toBeInTheDocument();
    expect(screen.getByText('2 secciones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ruta' })).toHaveAttribute('href', '/paths/path-1');
  });

  it('keeps card render and shows count fallback when one path detail fetch fails', async () => {
    getPaths.mockResolvedValue([
      {
        id: 'path-1',
        slug: 'web-foundations',
        title: 'Web Foundations',
        description: null,
        moduleCount: 0,
        sectionCount: 0
      },
      {
        id: 'path-2',
        slug: 'api-fundamentals',
        title: 'API Fundamentals',
        description: null,
        moduleCount: 0,
        sectionCount: 0
      }
    ]);
    getPath.mockImplementation(async (pathId: string) => {
      if (pathId === 'path-1') {
        throw new Error('detail failed');
      }

      return {
        id: 'path-2',
        slug: 'api-fundamentals',
        title: 'API Fundamentals',
        description: null,
        modules: [
          {
            id: 'module-2',
            slug: 'rest',
            title: 'REST',
            sortOrder: 1,
            sections: [{ id: 's3', slug: 'status', title: 'Status', sortOrder: 1 }]
          }
        ]
      };
    });

    render(await CoursesPage());

    expect(screen.getByRole('heading', { name: 'Web Foundations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'API Fundamentals' })).toBeInTheDocument();
    expect(screen.getByText('Conteo no disponible')).toBeInTheDocument();
    expect(screen.getByText('1 módulos')).toBeInTheDocument();
    expect(screen.getByText('1 secciones')).toBeInTheDocument();
  });

  it('shows empty state when no paths are available', async () => {
    getPaths.mockResolvedValue([]);

    render(await CoursesPage());

    const notice = screen.getByText('Aún no hay cursos disponibles.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
  });

  it('shows non-fatal unavailable notice when paths fetch fails', async () => {
    getPaths.mockRejectedValue(new Error('catalog down'));

    render(await CoursesPage());

    const notice = screen.getByText('No pudimos cargar el catálogo de cursos en este momento.');
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveClass('stateInlineNotice');
  });
});
