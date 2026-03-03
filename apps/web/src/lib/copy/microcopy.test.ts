import { describe, expect, it } from 'vitest';
import { microcopy } from './microcopy';

describe('microcopy', () => {
  it('defines consistent auth action labels', () => {
    expect(microcopy.auth.actions.logIn).toBe('Iniciar sesión');
    expect(microcopy.auth.actions.signUp).toBe('Crear cuenta');
    expect(microcopy.auth.actions.logOut).toBe('Cerrar sesión');
  });

  it('defines deterministic known auth and player error copy', () => {
    expect(microcopy.auth.errors.invalidCredentials).toBe('Correo o contraseña incorrectos.');
    expect(microcopy.auth.errors.rateLimited).toBe('Demasiados intentos de autenticación. Intenta más tarde.');
    expect(microcopy.player.complete.completeFailed).toBe(
      'No pudimos marcar la sección como completada. Intenta de nuevo.'
    );
    expect(microcopy.quiz.submitFailed).toBe('No pudimos enviar el quiz en este momento. Intenta de nuevo.');
  });

  it('provides global state copy used by error and skeleton surfaces', () => {
    expect(microcopy.state.loadingPage).toBe('Cargando contenido de la página');
    expect(microcopy.state.globalError.title).toBe('Algo salió mal');
    expect(microcopy.state.globalError.tryAgain).toBe('Intentar de nuevo');
  });
});
