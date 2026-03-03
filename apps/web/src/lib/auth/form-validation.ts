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
    errors.email = 'El correo es obligatorio';
  } else if (!isValidEmail(email)) {
    errors.email = 'Ingresa un correo válido';
  }

  if (password.length === 0) {
    errors.password = 'La contraseña es obligatoria';
  }

  return errors;
}

export function validateSignupInput(input: SignupValidationInput): AuthFieldErrors {
  const name = normalizeAuthField(input.name);
  const email = normalizeAuthField(input.email);
  const password = normalizeAuthField(input.password);
  const errors: AuthFieldErrors = {};

  if (name.length === 0) {
    errors.name = 'El nombre es obligatorio';
  }

  if (email.length === 0) {
    errors.email = 'El correo es obligatorio';
  } else if (!isValidEmail(email)) {
    errors.email = 'Ingresa un correo válido';
  }

  if (password.length === 0) {
    errors.password = 'La contraseña es obligatoria';
  } else if (password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres';
  }

  return errors;
}
