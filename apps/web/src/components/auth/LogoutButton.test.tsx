import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogoutButton } from './LogoutButton';

const push = vi.fn();
const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh
  })
}));

describe('LogoutButton', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    vi.restoreAllMocks();
  });

  it('posts logout and redirects to login on success', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith('/api/auth/logout', { method: 'POST' });
      expect(push).toHaveBeenCalledWith('/login');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('still redirects to login when logout request fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows pending label and disables button while request is in flight', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(screen.getByRole('button', { name: 'Logging out...' })).toBeDisabled();

    resolveFetch?.(new Response('{}', { status: 200 }));
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
  });
});
