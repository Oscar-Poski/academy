import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomeHero } from './HomeHero';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe('HomeHero', () => {
  it('renders hero copy and anonymous secondary CTA', () => {
    render(<HomeHero authenticated={false} />);

    expect(
      screen.getByRole('heading', {
        name: 'Aprende habilidades de IT desde cero con rutas guiadas y práctica inmediata.'
      })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar cursos' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByText('Progreso visible por secciones')).toBeInTheDocument();
    expect(screen.getByText('Miles de estudiantes ya están avanzando con este método.')).toBeInTheDocument();
  });

  it('renders authenticated secondary CTA', () => {
    render(<HomeHero authenticated />);

    expect(screen.getByRole('link', { name: 'Ir a mi inicio' })).toHaveAttribute('href', '/');
  });
});
