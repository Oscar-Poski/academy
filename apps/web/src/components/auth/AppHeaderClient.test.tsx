import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeaderClient } from './AppHeaderClient';

const usePathnameMock = vi.fn();
const logoutOnActionMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock()
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    onClick,
    children,
    ...rest
  }: {
    href: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...rest}
    >
      {children}
    </a>
  )
}));

vi.mock('./LogoutButton', () => ({
  LogoutButton: ({ onAction }: { onAction?: () => void }) => (
    <button
      type="button"
      onClick={() => {
        logoutOnActionMock();
        onAction?.();
      }}
    >
      Cerrar sesión
    </button>
  )
}));

describe('AppHeaderClient', () => {
  beforeEach(() => {
    usePathnameMock.mockReset();
    logoutOnActionMock.mockReset();
    usePathnameMock.mockReturnValue('/');
  });

  it('renders Home + auth actions for anonymous state', () => {
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Academy MVP' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cursos' })).toHaveAttribute('href', '/courses');
    expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', '/signup');
  });

  it('renders Home + email + logout for authenticated state', () => {
    render(
      <AppHeaderClient
        appName="Academy MVP"
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
    expect(screen.getByText('student@academy.local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument();
  });

  it('toggles menu open and closed from menu button', () => {
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);
    const menuButton = screen.getByRole('button', { name: 'Menú' });
    const panel = screen.getByTestId('app-header-menu-panel');

    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('data-open', 'false');

    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar menú' }));
    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(panel).toHaveAttribute('data-open', 'false');
  });

  it('moves focus to first menu action when opening the menu', () => {
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));

    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Inicio' }));
  });

  it('closes menu on Escape and restores focus to toggle button', () => {
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Menú' }));
  });

  it('closes menu when selecting a nav action', () => {
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    expect(screen.getByTestId('app-header-menu-panel')).toHaveAttribute('data-open', 'true');

    fireEvent.click(screen.getByRole('link', { name: 'Crear cuenta' }));
    expect(screen.getByTestId('app-header-menu-panel')).toHaveAttribute('data-open', 'false');
  });

  it('applies active class on Home link when pathname is root', () => {
    usePathnameMock.mockReturnValue('/');
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Inicio' })).toHaveClass('appNavLink--active');
    expect(screen.getByRole('link', { name: 'Cursos' })).not.toHaveClass('appNavLink--active');
  });

  it('applies active class on courses link when pathname is /courses', () => {
    usePathnameMock.mockReturnValue('/courses');
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Cursos' })).toHaveClass('appNavLink--active');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveClass('appNavLink--active');
  });

  it('applies active class on courses link when pathname is a path detail route', () => {
    usePathnameMock.mockReturnValue('/paths/path-1');
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Cursos' })).toHaveClass('appNavLink--active');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveClass('appNavLink--active');
  });

  it('applies active class on courses link when pathname is a module detail route', () => {
    usePathnameMock.mockReturnValue('/modules/module-1');
    render(<AppHeaderClient appName="Academy MVP" sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Cursos' })).toHaveClass('appNavLink--active');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveClass('appNavLink--active');
  });

  it('closes menu when logout action is triggered', () => {
    render(
      <AppHeaderClient
        appName="Academy MVP"
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

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(logoutOnActionMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('app-header-menu-panel')).toHaveAttribute('data-open', 'false');
  });
});
