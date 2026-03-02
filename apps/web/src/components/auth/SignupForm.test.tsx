import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupForm } from './SignupForm';

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

describe('SignupForm', () => {
  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    getSearchParam.mockReset();
    getSearchParam.mockReturnValue(null);
    vi.restoreAllMocks();
  });

  it('renders form fields and submit button', () => {
    render(<SignupForm />);

    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('submits successfully and redirects to root by default', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('uses next query param for redirect target', async () => {
    getSearchParam.mockImplementation((name: string) => (name === 'next' ? '/learn/section-1' : null));
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/learn/section-1');
    });
  });

  it('shows duplicate email message from API', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'email_in_use', message: 'Email already registered' }), {
        status: 409
      })
    );
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'existing@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
    expect(push).not.toHaveBeenCalled();
  });

  it('shows generic message for network failures', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(screen.getByText('Unable to create account right now. Try again.')).toBeInTheDocument();
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

    render(<SignupForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    const button = screen.getByRole('button', { name: 'Create account' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();

    resolveFetch?.(new Response('{}', { status: 200 }));
    await waitFor(() => {
      expect(push).toHaveBeenCalled();
    });
  });
});
