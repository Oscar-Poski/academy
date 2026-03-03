import { describe, expect, it } from 'vitest';
import { validateLoginInput, validateSignupInput } from './form-validation';

describe('auth form validation', () => {
  it('flags empty login email and password', () => {
    expect(validateLoginInput({ email: '', password: '' })).toEqual({
      email: 'El correo es obligatorio',
      password: 'La contraseña es obligatoria'
    });
  });

  it('flags malformed login email', () => {
    expect(validateLoginInput({ email: 'invalid-email', password: 'password123' })).toEqual({
      email: 'Ingresa un correo válido'
    });
  });

  it('flags empty signup name', () => {
    expect(
      validateSignupInput({
        name: '',
        email: 'student@academy.local',
        password: 'password123'
      })
    ).toEqual({
      name: 'El nombre es obligatorio'
    });
  });

  it('flags short signup password', () => {
    expect(
      validateSignupInput({
        name: 'Student',
        email: 'student@academy.local',
        password: 'short'
      })
    ).toEqual({
      password: 'La contraseña debe tener al menos 8 caracteres'
    });
  });

  it('returns no errors for valid login and signup inputs', () => {
    expect(validateLoginInput({ email: 'student@academy.local', password: 'password123' })).toEqual({});
    expect(
      validateSignupInput({
        name: 'Student',
        email: 'student@academy.local',
        password: 'password123'
      })
    ).toEqual({});
  });
});
