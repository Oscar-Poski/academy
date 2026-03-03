import { describe, expect, it } from 'vitest';
import { microcopy } from './microcopy';

describe('microcopy', () => {
  it('defines consistent auth action labels', () => {
    expect(microcopy.auth.actions.logIn).toBe('Iniciar sesión');
    expect(microcopy.auth.actions.signUp).toBe('Crear cuenta');
    expect(microcopy.auth.actions.logOut).toBe('Cerrar sesión');
    expect(microcopy.nav.courses).toBe('Cursos');
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

  it('defines deterministic courses catalog copy', () => {
    expect(microcopy.courses.title).toBe('Cursos disponibles');
    expect(microcopy.courses.subtitle).toBe('Explora rutas públicas y entra a la que quieras comenzar.');
    expect(microcopy.courses.openPath).toBe('Ver ruta');
    expect(microcopy.courses.modulesCountLabel).toBe('módulos');
    expect(microcopy.courses.sectionsCountLabel).toBe('secciones');
    expect(microcopy.courses.empty).toBe('Aún no hay cursos disponibles.');
    expect(microcopy.courses.unavailable).toBe('No pudimos cargar el catálogo de cursos en este momento.');
    expect(microcopy.courses.countUnavailable).toBe('Conteo no disponible');
  });

  it('defines catalog auth guidance copy', () => {
    expect(microcopy.catalog.logInCta).toBe('Iniciar sesión');
    expect(microcopy.catalog.logInToTrackProgress).toBe('Inicia sesión para guardar tu progreso.');
    expect(microcopy.catalog.logInToStartSection).toBe('Iniciar sesión para comenzar');
  });

  it('defines home hero and featured copy', () => {
    expect(microcopy.home.hero.title).toBe('Aprende habilidades de IT desde cero con rutas guiadas y práctica inmediata.');
    expect(microcopy.home.hero.primaryCta).toBe('Explorar cursos');
    expect(microcopy.home.hero.secondaryCtaAnon).toBe('Iniciar sesión');
    expect(microcopy.home.hero.secondaryCtaAuth).toBe('Ir a mi inicio');
    expect(microcopy.home.featured.title).toBe('Cursos destacados');
    expect(microcopy.home.featured.viewPath).toBe('Ver ruta');
    expect(microcopy.home.featured.viewAll).toBe('Ver todos los cursos');
    expect(microcopy.home.featured.empty).toBe('Aún no hay cursos destacados disponibles.');
    expect(microcopy.home.featured.unavailable).toBe('No pudimos cargar los cursos destacados en este momento.');
  });
});
