export type AuthFieldErrors = {
  email?: string;
  password?: string;
  name?: string;
};

type LoginValidationInput = {
  email: string;
  password: string;
};

type SignupValidationInput = {
  name: string;
  email: string;
  password: string;
};

export function normalizeAuthField(value: string): string {
  return value.trim();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validateLoginInput(input: LoginValidationInput): AuthFieldErrors {
  const email = normalizeAuthField(input.email);
  const password = normalizeAuthField(input.password);
  const errors: AuthFieldErrors = {};

  if (email.length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (password.length === 0) {
    errors.password = 'Password is required';
  }

  return errors;
}

export function validateSignupInput(input: SignupValidationInput): AuthFieldErrors {
  const name = normalizeAuthField(input.name);
  const email = normalizeAuthField(input.email);
  const password = normalizeAuthField(input.password);
  const errors: AuthFieldErrors = {};

  if (name.length === 0) {
    errors.name = 'Name is required';
  }

  if (email.length === 0) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (password.length === 0) {
    errors.password = 'Password is required';
  } else if (password.length < 8) {
    errors.password = 'Password must be at least 8 characters long';
  }

  return errors;
}
