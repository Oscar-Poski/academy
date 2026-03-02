import { describe, expect, it } from 'vitest';
import { validateLoginInput, validateSignupInput } from './form-validation';

describe('auth form validation', () => {
  it('flags empty login email and password', () => {
    expect(validateLoginInput({ email: '', password: '' })).toEqual({
      email: 'Email is required',
      password: 'Password is required'
    });
  });

  it('flags malformed login email', () => {
    expect(validateLoginInput({ email: 'invalid-email', password: 'password123' })).toEqual({
      email: 'Enter a valid email address'
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
      name: 'Name is required'
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
      password: 'Password must be at least 8 characters long'
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
