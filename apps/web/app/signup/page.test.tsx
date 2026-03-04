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

vi.mock('@/src/components/auth/SignupForm', () => ({
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>
}));

import SignupPage from './page';

describe('SignupPage', () => {
  beforeEach(() => {
    getSessionProfile.mockReset();
    redirect.mockReset();
  });

  it('renders signup form for unauthenticated visitors', async () => {
    getSessionProfile.mockResolvedValue({ authenticated: false });

    render(await SignupPage({}));

    expect(screen.getByText('Signup Form')).toBeInTheDocument();
    expect(screen.getByTestId('signup-form').closest('.authShell')).toBeInTheDocument();
    expect(screen.getByText('Crear cuenta')).toHaveClass('authShellEyebrow');
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

    await expect(SignupPage({})).rejects.toThrow('NEXT_REDIRECT');
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

    await expect(SignupPage({ searchParams: { next: '/learn/abc' } })).rejects.toThrow('NEXT_REDIRECT');
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

    await expect(SignupPage({ searchParams: { next: '//evil.com' } })).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/');
  });
});
