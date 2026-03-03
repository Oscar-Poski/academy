import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppFooter } from './AppFooter';

vi.mock('@/src/components/auth/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Cerrar sesión</button>
}));

describe('AppFooter', () => {
  it('renders footer metadata and anonymous auth actions', () => {
    render(<AppFooter sessionProfile={{ authenticated: false }} />);

    expect(screen.getByText(/HekaDemos/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Cursos' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/signup');
  });

  it('renders authenticated footer actions', () => {
    render(
      <AppFooter
        sessionProfile={{
          authenticated: true,
          user: {
            id: 'u1',
            email: 'student@academy.local',
            name: 'Student',
            role: 'user'
          }
        }}
      />
    );

    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cursos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });
});
