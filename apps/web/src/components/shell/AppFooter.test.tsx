import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppFooter } from './AppFooter';

vi.mock('@/src/components/auth/LogoutButton', () => ({
  LogoutButton: () => <button type="button">Log out</button>
}));

describe('AppFooter', () => {
  it('renders footer metadata and anonymous auth actions', () => {
    render(<AppFooter sessionProfile={{ authenticated: false }} />);

    expect(screen.getByText(/Academy MVP/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
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

    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });
});
