import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeaturedCourses } from './FeaturedCourses';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe('FeaturedCourses', () => {
  it('renders capped courses grid with links', () => {
    render(
      <FeaturedCourses
        unavailable={false}
        courses={[
          {
            id: 'path-1',
            slug: 'web',
            title: 'Web Foundations',
            description: 'Base path',
            moduleCount: 1,
            sectionCount: 2
          }
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: 'Cursos destacados' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Web Foundations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver ruta' })).toHaveAttribute('href', '/paths/path-1');
    expect(screen.getByRole('link', { name: 'Ver todos los cursos' })).toHaveAttribute('href', '/courses');
  });

  it('renders empty notice when there are no courses', () => {
    render(<FeaturedCourses unavailable={false} courses={[]} />);

    expect(screen.getByText('Aún no hay cursos destacados disponibles.')).toBeInTheDocument();
  });

  it('renders unavailable notice when load fails', () => {
    render(<FeaturedCourses unavailable courses={[]} />);

    expect(screen.getByText('No pudimos cargar los cursos destacados en este momento.')).toBeInTheDocument();
  });
});
