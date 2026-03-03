export const microcopy = {
  nav: {
    home: 'Inicio',
    courses: 'Cursos',
    menu: 'Menú',
    closeMenu: 'Cerrar menú',
    primaryNavigationAriaLabel: 'Navegación principal',
    footerNavigationAriaLabel: 'Navegación del pie de página'
  },
  auth: {
    actions: {
      logIn: 'Iniciar sesión',
      signUp: 'Crear cuenta',
      logOut: 'Cerrar sesión'
    },
    headings: {
      logIn: 'Iniciar sesión',
      signUp: 'Crear cuenta'
    },
    descriptions: {
      logIn: 'Usa tus credenciales de Academy para continuar aprendiendo.',
      signUp: 'Crea tu cuenta de Academy para comenzar a aprender.'
    },
    links: {
      needAccountPrefix: '¿Eres nuevo aquí?',
      needAccountAction: 'Crear cuenta',
      alreadyHaveAccountPrefix: '¿Ya tienes una cuenta?',
      alreadyHaveAccountAction: 'Iniciar sesión'
    },
    fields: {
      name: 'Nombre',
      email: 'Correo',
      password: 'Contraseña'
    },
    buttons: {
      logIn: 'Iniciar sesión',
      loggingIn: 'Iniciando sesión...',
      signUp: 'Crear cuenta',
      signingUp: 'Creando cuenta...',
      loggingOut: 'Cerrando sesión...'
    },
    errors: {
      invalidCredentials: 'Correo o contraseña incorrectos.',
      emailInUse: 'Este correo ya está registrado.',
      weakPassword: 'La contraseña debe tener al menos 8 caracteres.',
      invalidRegistrationInput: 'Los datos de registro no son válidos.',
      rateLimited: 'Demasiados intentos de autenticación. Intenta más tarde.',
      sessionExpired: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
      signInUnavailable: 'No pudimos iniciar sesión en este momento. Intenta de nuevo.',
      signUpUnavailable: 'No pudimos crear tu cuenta en este momento. Intenta de nuevo.'
    }
  },
  home: {
    hero: {
      eyebrow: 'Academia en línea',
      title: 'Aprende habilidades de IT desde cero con rutas guiadas y práctica inmediata.',
      subtitle:
        'Consigue trabajo en cualquier área de IT. Empieza a estudiar y avanza sección por sección.',
      primaryCta: 'Explorar cursos',
      secondaryCtaAnon: 'Iniciar sesión',
      secondaryCtaAuth: 'Ir a mi inicio'
    },
    featured: {
      title: 'Cursos destacados',
      subtitle: 'Empieza con estas rutas recomendadas para avanzar rápido.',
      viewPath: 'Ver ruta',
      viewAll: 'Ver todos los cursos',
      descriptionFallback: 'Ruta disponible para comenzar hoy.',
      empty: 'Aún no hay cursos destacados disponibles.',
      unavailable: 'No pudimos cargar los cursos destacados en este momento.'
    },
    sectionTitle: 'Continúa aprendiendo',
    resumeSection: 'Retomar sección',
    startLearning: 'Comenzar a aprender',
    onboardingHint: 'Todo está listo. Comienza tu primera sección.',
    onboardingCta: 'Comenzar mi primera sección',
    fallback: 'Las recomendaciones de aprendizaje no están disponibles por el momento.'
  },
  courses: {
    title: 'Cursos disponibles',
    subtitle: 'Explora rutas públicas y entra a la que quieras comenzar.',
    openPath: 'Ver ruta',
    modulesCountLabel: 'módulos',
    sectionsCountLabel: 'secciones',
    empty: 'Aún no hay cursos disponibles.',
    unavailable: 'No pudimos cargar el catálogo de cursos en este momento.',
    countUnavailable: 'Conteo no disponible'
  },
  catalog: {
    pathLabel: 'Ruta',
    moduleLabel: 'Módulo',
    sectionsLabel: 'Secciones',
    openModule: 'Abrir módulo',
    logInCta: 'Iniciar sesión',
    logInToTrackProgress: 'Inicia sesión para guardar tu progreso.',
    logInToStartSection: 'Iniciar sesión para comenzar',
    start: 'Comenzar',
    locked: 'Bloqueado',
    lockedReasonFallback: 'Bloqueado',
    noSectionsInModuleYet: 'Aún no hay secciones en este módulo.',
    emptyModuleSections: 'Aún no hay secciones disponibles.',
    pathProgress: 'Progreso de la ruta',
    moduleProgress: 'Progreso del módulo',
    progressUnavailable: 'Los indicadores de progreso no están disponibles en este momento.',
    progress: {
      completeSuffix: 'completado',
      modulesWord: 'módulos',
      sectionsWord: 'secciones'
    },
    status: {
      completed: 'Completada',
      inProgress: 'En progreso',
      notStarted: 'Sin comenzar'
    },
    actions: {
      review: 'Repasar',
      continue: 'Continuar',
      start: 'Comenzar'
    },
    lockedAriaPrefix: 'Bloqueado:'
  },
  player: {
    previousSection: 'Sección anterior',
    nextSection: 'Sección siguiente',
    progressUnavailable: 'Los indicadores de progreso no están disponibles en este momento.',
    noLessonBlocks: 'Aún no hay bloques de lección disponibles para esta sección.',
    sidebarAriaLabel: 'Navegación del curso',
    sidebarEyebrow: 'Ruta',
    lockedAriaPrefix: 'Bloqueado:',
    navigationUnavailable: {
      locked: 'la sección está bloqueada',
      missingTarget: 'no hay una sección de destino disponible'
    },
    status: {
      completed: 'Completada',
      inProgress: 'En progreso',
      notStarted: 'Sin comenzar'
    },
    meta: {
      completedSuffix: 'completado',
      blockSingular: 'bloque',
      blockPlural: 'bloques',
      readTimeSuffix: 'min de lectura'
    },
    complete: {
      action: 'Marcar como completada',
      completing: 'Completando...',
      completed: 'Completada',
      blockedTitle: 'No se puede completar aún',
      goToQuiz: 'Ir al quiz',
      evaluateUnlock: 'Evaluar desbloqueo',
      evaluatingUnlock: 'Evaluando...',
      unlockedRetrying: 'Módulo desbloqueado. Reintentando completar...',
      stillLocked: 'El módulo sigue bloqueado. Resuelve los requisitos restantes e intenta de nuevo.',
      completeFailed: 'No pudimos marcar la sección como completada. Intenta de nuevo.',
      evaluateFailed: 'No pudimos evaluar el desbloqueo en este momento. Intenta de nuevo.'
    },
    blocks: {
      unsupportedType: 'Tipo de bloque no compatible:',
      invalidMarkdownPayload: 'El contenido del bloque de markdown no es válido.',
      invalidCalloutPayload: 'El contenido del bloque de aviso no es válido.',
      invalidCodePayload: 'El contenido del bloque de código no es válido.',
      invalidChecklistPayload: 'El contenido del bloque de checklist no es válido.',
      quizPlaceholderBadge: 'Placeholder de quiz',
      quizPlaceholderText: 'El contenido del quiz será interactivo en una próxima PR.'
    }
  },
  quiz: {
    panelTitle: 'Quiz de la sección',
    panelSubtitle: 'Responde las preguntas y envía cuando estés listo.',
    submit: 'Enviar quiz',
    submitting: 'Enviando...',
    retry: 'Reintentar quiz',
    passed: 'Aprobado',
    notPassed: 'No aprobado',
    submitFailed: 'No pudimos enviar el quiz en este momento. Intenta de nuevo.',
    yourAnswer: 'Tu respuesta',
    score: 'Puntaje',
    attempt: 'Intento',
    correct: 'Correcta',
    incorrect: 'Incorrecta',
    pointsSuffix: 'pts'
  },
  state: {
    loadingPage: 'Cargando contenido de la página',
    globalError: {
      title: 'Algo salió mal',
      message: 'No se pudo cargar la página. Puedes reintentar ahora o volver al inicio.',
      tryAgain: 'Intentar de nuevo',
      safeRouteTitle: '¿Necesitas una ruta segura?',
      safeRouteMessage: 'Regresa a la página de inicio.'
    }
  },
  errors: {
    unauthorized: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
    internalError: 'Algo salió mal. Intenta de nuevo.',
    rateLimitedSuffixPrefix: 'Intenta de nuevo en',
    rateLimitedSuffixSeconds: 'segundos'
  },
  reasonMappings: {
    passQuizBeforeComplete: 'Aprueba el quiz antes de completar esta sección.',
    modulePrerequisitesNotMet: 'Aún no cumples los requisitos para desbloquear el módulo.',
    insufficientCredits: 'No tienes créditos suficientes.',
    completePrerequisiteSectionPrefix: 'Completa la sección prerequisito',
    passQuizForSectionPrefix: 'Aprueba el quiz de la sección',
    redeemCreditsPrefix: 'Canjea créditos para desbloquear el módulo',
    reachLevelPrefix: 'Alcanza el nivel',
    toUnlockModuleInfix: 'para desbloquear el módulo'
  }
} as const;

const knownErrorMessages: Record<string, string> = {
  invalid_credentials: microcopy.auth.errors.invalidCredentials,
  email_in_use: microcopy.auth.errors.emailInUse,
  weak_password: microcopy.auth.errors.weakPassword,
  invalid_registration_input: microcopy.auth.errors.invalidRegistrationInput,
  rate_limited: microcopy.auth.errors.rateLimited,
  unauthorized: microcopy.errors.unauthorized,
  internal_error: microcopy.errors.internalError
};

export function getKnownErrorMessage(code: unknown): string | null {
  if (typeof code !== 'string') {
    return null;
  }

  return knownErrorMessages[code] ?? null;
}

export function getKnownReasonMessage(reason: unknown): string | null {
  if (typeof reason !== 'string') {
    return null;
  }

  const normalizedReason = reason.trim();
  if (normalizedReason.length === 0) {
    return null;
  }

  if (normalizedReason === 'Pass quiz before completing this section.') {
    return microcopy.reasonMappings.passQuizBeforeComplete;
  }

  if (normalizedReason === 'Module unlock prerequisites are not met') {
    return microcopy.reasonMappings.modulePrerequisitesNotMet;
  }

  if (normalizedReason === 'Insufficient credits') {
    return microcopy.reasonMappings.insufficientCredits;
  }

  const completePrefix = 'Complete prerequisite section:';
  if (normalizedReason.startsWith(completePrefix)) {
    const sectionId = normalizedReason.slice(completePrefix.length).trim();
    return `${microcopy.reasonMappings.completePrerequisiteSectionPrefix}: ${sectionId}`;
  }

  const passQuizPrefix = 'Pass quiz for section:';
  if (normalizedReason.startsWith(passQuizPrefix)) {
    const sectionId = normalizedReason.slice(passQuizPrefix.length).trim();
    return `${microcopy.reasonMappings.passQuizForSectionPrefix}: ${sectionId}`;
  }

  const redeemPrefix = 'Redeem credits to unlock module:';
  if (normalizedReason.startsWith(redeemPrefix)) {
    const moduleId = normalizedReason.slice(redeemPrefix.length).trim();
    return `${microcopy.reasonMappings.redeemCreditsPrefix}: ${moduleId}`;
  }

  const levelMatch = normalizedReason.match(/^Reach level\s+(\d+)\s+to unlock module:\s+(.+)$/);
  if (levelMatch) {
    const requiredLevel = levelMatch[1];
    const moduleId = levelMatch[2];
    return `${microcopy.reasonMappings.reachLevelPrefix} ${requiredLevel} ${microcopy.reasonMappings.toUnlockModuleInfix}: ${moduleId}`;
  }

  return null;
}
