export const microcopy = {
  nav: {
    home: 'Home',
    menu: 'Menu',
    closeMenu: 'Close menu'
  },
  auth: {
    actions: {
      logIn: 'Log in',
      signUp: 'Sign up',
      logOut: 'Log out'
    },
    headings: {
      logIn: 'Log in',
      signUp: 'Sign up'
    },
    descriptions: {
      logIn: 'Use your Academy credentials to continue learning.',
      signUp: 'Create your Academy account to start learning.'
    },
    links: {
      needAccountPrefix: 'New here?',
      needAccountAction: 'Sign up',
      alreadyHaveAccountPrefix: 'Already have an account?',
      alreadyHaveAccountAction: 'Log in'
    },
    buttons: {
      logIn: 'Log in',
      loggingIn: 'Logging in...',
      signUp: 'Sign up',
      signingUp: 'Signing up...',
      loggingOut: 'Logging out...'
    },
    errors: {
      invalidCredentials: 'Invalid email or password.',
      emailInUse: 'Email already registered.',
      weakPassword: 'Password must be at least 8 characters long.',
      invalidRegistrationInput: 'Invalid registration details.',
      rateLimited: 'Too many auth attempts. Try again later.',
      sessionExpired: 'Your session is no longer valid. Please log in again.',
      signInUnavailable: 'Unable to log in right now. Try again.',
      signUpUnavailable: 'Unable to create your account right now. Try again.'
    }
  },
  home: {
    sectionTitle: 'Continue learning',
    resumeSection: 'Resume section',
    startLearning: 'Start learning',
    onboardingHint: 'You are all set. Start your first section.',
    onboardingCta: 'Start your first section',
    fallback: 'Learning recommendations are temporarily unavailable.'
  },
  catalog: {
    pathLabel: 'Path',
    moduleLabel: 'Module',
    sectionsLabel: 'Sections',
    openModule: 'Open module',
    start: 'Start',
    locked: 'Locked',
    lockedReasonFallback: 'Locked',
    noSectionsInModuleYet: 'No sections in this module yet.',
    emptyModuleSections: 'No sections available yet.',
    pathProgress: 'Path Progress',
    moduleProgress: 'Module Progress',
    progressUnavailable: 'Progress indicators unavailable right now.'
  },
  player: {
    previousSection: 'Previous Section',
    nextSection: 'Next Section',
    progressUnavailable: 'Progress indicators unavailable right now.',
    noLessonBlocks: 'No lesson blocks available for this section yet.',
    complete: {
      action: 'Mark Complete',
      completing: 'Completing...',
      completed: 'Completed',
      blockedTitle: 'Completion blocked',
      goToQuiz: 'Go to Quiz',
      evaluateUnlock: 'Evaluate Unlock',
      evaluatingUnlock: 'Evaluating...',
      unlockedRetrying: 'Module unlocked. Retrying completion...',
      stillLocked: 'Module is still locked. Resolve the remaining requirements and try again.',
      completeFailed: 'Unable to mark section complete. Try again.',
      evaluateFailed: 'Unable to evaluate unlock right now. Try again.'
    }
  },
  quiz: {
    panelTitle: 'Section Quiz',
    panelSubtitle: 'Answer the questions below and submit when you are ready.',
    submit: 'Submit Quiz',
    submitting: 'Submitting...',
    retry: 'Retry Quiz',
    passed: 'Passed',
    notPassed: 'Not Passed',
    submitFailed: 'Unable to submit quiz right now. Try again.'
  },
  state: {
    loadingPage: 'Loading page content',
    globalError: {
      title: 'Something went wrong',
      message: 'The page failed to load. You can retry now or return home.',
      tryAgain: 'Try again',
      safeRouteTitle: 'Need a safe route?',
      safeRouteMessage: 'Go back to the home page.'
    }
  },
  errors: {
    unauthorized: 'Your session is no longer valid. Please log in again.',
    internalError: 'Something went wrong. Please try again.',
    rateLimitedSuffixPrefix: 'Try again in'
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
