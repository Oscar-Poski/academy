import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionProfile, redirect } = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  redirect: vi.fn()
}));

vi.mock('./get-session-profile.server', () => ({
  getSessionProfile
}));

vi.mock('next/navigation', () => ({
  redirect
}));

import { requireAuthSession } from './require-auth-session.server';

describe('requireAuthSession', () => {
  beforeEach(() => {
    getSessionProfile.mockReset();
    redirect.mockReset();
  });

  it('returns user profile when session is authenticated', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: true,
      user: {
        id: 'u1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user'
      }
    });

    await expect(requireAuthSession('/')).resolves.toEqual({
      id: 'u1',
      email: 'student@academy.local',
      name: 'Student',
      role: 'user'
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects to login with encoded next path for unauthenticated session', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: false
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(requireAuthSession('/learn/section-1')).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login?next=%2Flearn%2Fsection-1');
  });

  it('preserves querystring in encoded next path', async () => {
    getSessionProfile.mockResolvedValue({
      authenticated: false
    });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });

    await expect(requireAuthSession('/learn/abc?tab=quiz')).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/login?next=%2Flearn%2Fabc%3Ftab%3Dquiz');
  });
});
