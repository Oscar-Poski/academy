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

    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('shows inline field errors and blocks submit when invalid', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '' } });
    fireEvent.blur(screen.getByLabelText('Nombre'));
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'invalid-email' } });
    fireEvent.blur(screen.getByLabelText('Correo'));
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'short' } });
    fireEvent.blur(screen.getByLabelText('Contraseña'));

    expect(await screen.findByText('El nombre es obligatorio')).toBeInTheDocument();
    expect(await screen.findByText('Ingresa un correo válido')).toBeInTheDocument();
    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('submits successfully and redirects to root by default', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/');
      expect(refresh).toHaveBeenCalledTimes(1);
    });
  });

  it('uses next query param for redirect target', async () => {
    getSearchParam.mockImplementation((name: string) => (name === 'next' ? '/learn/section-1' : null));
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

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

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'existing@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('Este correo ya está registrado.')).toBeInTheDocument();
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
          retry_after_seconds: 30
        }),
        { status: 429 }
      )
    );
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(
        screen.getByText('Demasiados intentos de autenticación. Intenta más tarde. Intenta de nuevo en 30 segundos.')
      ).toBeInTheDocument();
    });
  });

  it('shows generic message for network failures', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    render(<SignupForm />);

    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(screen.getByText('No pudimos crear tu cuenta en este momento. Intenta de nuevo.')).toBeInTheDocument();
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
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'new@academy.local' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password123' } });
    const button = screen.getByRole('button', { name: 'Crear cuenta' });
    fireEvent.click(button);

    expect(screen.getByRole('button', { name: 'Creando cuenta...' })).toBeDisabled();

    resolveFetch?.(new Response('{}', { status: 200 }));
    await waitFor(() => {
      expect(push).toHaveBeenCalled();
    });
  });
});
