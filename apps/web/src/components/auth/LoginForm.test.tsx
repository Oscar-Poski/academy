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

    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('shows inline field errors and blocks submit when invalid', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Correo'));
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Contraseña'));

    expect(await screen.findByText('El correo es obligatorio')).toBeInTheDocument();
    expect(await screen.findByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits successfully and redirects to root by default', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'student@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('uses next query param for redirect target', async () => {
    getSearchParam.mockImplementation((name: string) => (name === 'next' ? '/learn/section-1' : null));
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

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

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'student@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument();
    });
    expect(document.querySelector('.uiAlert--danger')).toBeTruthy();
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

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(
        screen.getByText('Demasiados intentos de autenticación. Intenta más tarde. Intenta de nuevo en 25 segundos.')
      ).toBeInTheDocument();
    });
  });

  it('shows generic message on network failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    render(<LoginForm />);

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    await waitFor(() => {
      expect(screen.getByText('No pudimos iniciar sesión en este momento. Intenta de nuevo.')).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(screen.getByRole('button', { name: 'Iniciando sesión...' })).toBeDisabled();

    resolveFetch?.(new Response('{}', { status: 200 }));
    await waitFor(() => {
      expect(push).toHaveBeenCalled();
    });
  });
});
