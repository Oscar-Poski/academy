import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from './LoginForm';

const push = vi.fn();
const refresh = vi.fn();
const getSearchParam = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    refresh
  }),
  useSearchParams: () => ({
    get: getSearchParam
  })
}));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    getSearchParam.mockReset();
    getSearchParam.mockReturnValue(null);
    vi.restoreAllMocks();
  });

  it('renders form controls and submit button', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows inline field errors and blocks submit when invalid', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Email'));
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Password'));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits successfully and redirects to root by default', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('uses next query param for redirect target', async () => {
    getSearchParam.mockImplementation((name: string) => (name === 'next' ? '/learn/section-1' : null));
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/learn/section-1');
    });
  });

  it('shows invalid credentials message from API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'invalid_credentials', message: 'Invalid email or password' }), {
        status: 401
      })
    );
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'student@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('shows rate limited message with retry hint', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'rate_limited',
          message: 'Too many auth attempts. Try again later.',
          retry_after_seconds: 25
        }),
        { status: 429 }
      )
    );
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(
        screen.getByText('Too many auth attempts. Try again later. Try again in 25 seconds.')
      ).toBeInTheDocument();
    });
  });

  it('shows generic message on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to sign in right now. Try again.')).toBeInTheDocument();
    });
  });

  it('disables submit while request is pending', async () => {
    let resolveFetch: ((value: Response) => void) | undefined;
    vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

    resolveFetch?.(new Response('{}', { status: 200 }));
    await waitFor(() => {
      expect(push).toHaveBeenCalled();
    });
  });
});
