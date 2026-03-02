import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionProfile, redirect } = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  redirect: vi.fn()
}));

vi.mock('@/src/lib/auth/get-session-profile.server', () => ({
  getSessionProfile
}));

vi.mock('next/navigation', () => ({
  redirect
}));

vi.mock('@/src/components/auth/LoginForm', () => ({
  LoginForm: () => <div>Login Form</div>
}));

import LoginPage from './page';

describe('LoginPage', () => {
  beforeEach(() => {
    getSessionProfile.mockReset();
    redirect.mockReset();
  });

  it('renders login form for unauthenticated visitors', async () => {
    getSessionProfile.mockResolvedValue({ authenticated: false });

    render(await LoginPage({}));

    expect(screen.getByText('Login Form')).toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects authenticated visitors to root by default', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: { id: 'u1', email: 'student@academy.local', name: 'Student', role: 'user' }
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(LoginPage({})).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/');
  });

  it('redirects authenticated visitors to safe next path', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: { id: 'u1', email: 'student@academy.local', name: 'Student', role: 'user' }
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(LoginPage({ searchParams: { next: '/learn/abc' } })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/learn/abc');
  });

  it('falls back to root for unsafe next path', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: { id: 'u1', email: 'student@academy.local', name: 'Student', role: 'user' }
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(LoginPage({ searchParams: { next: 'https://evil.com' } })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/');
  });
});
