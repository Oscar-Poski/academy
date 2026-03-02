import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

vi.mock('./LogoutButton', () => ({
  LogoutButton: () => <button type="button">Log out</button>
}));

describe('AppHeader', () => {
  it('renders login/signup actions for anonymous state', () => {
    render(<AppHeader sessionProfile={{ authenticated: false }} />);

    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
  });

  it('renders email and logout for authenticated state', () => {
    render(
      <AppHeader
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

    expect(screen.getByText('student@academy.local')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Sign up' })).not.toBeInTheDocument();
  });
});
