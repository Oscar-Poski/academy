'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Input } from '@/src/components/ui';
import type { AuthApiError } from '@/src/lib/auth/types';
import { safeNextPath } from '@/src/lib/auth/safe-next-path';
import type { AuthFieldErrors } from '@/src/lib/auth/form-validation';
import { validateLoginInput } from '@/src/lib/auth/form-validation';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'), '/');

  const [email, setEmail] = useState('student@academy.local');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentErrors = validateLoginInput({ email, password });
  const isValid = Object.keys(currentErrors).length === 0;
  const isSubmitDisabled = submitting || !isValid;

  function applyFieldValidation(field: 'email' | 'password'): void {
    const nextErrors = validateLoginInput({ email, password });
    setFieldErrors((previous) => {
      const updated = { ...previous };
      if (nextErrors[field]) {
        updated[field] = nextErrors[field];
      } else {
        delete updated[field];
      }
      return updated;
    });
  }

  function formatErrorMessage(payload: AuthApiError | null): string {
    if (!payload) {
      return 'Invalid email or password';
    }
    if (payload.code === 'rate_limited' && typeof payload.retry_after_seconds === 'number') {
      return `${payload.message} Try again in ${payload.retry_after_seconds} seconds.`;
    }
    return payload.message;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const validationErrors = validateLoginInput({ email, password });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setErrorMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AuthApiError | null;
        setErrorMessage(formatErrorMessage(payload));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setErrorMessage('Unable to sign in right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="form" className="playerCard pageCard" onSubmit={onSubmit}>
      <h1>Sign In</h1>
      <p className="pageMuted">Use your Academy credentials to continue learning.</p>

      <Input
        id="login-email"
        label="Email"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setErrorMessage(null);
        }}
        onBlur={() => applyFieldValidation('email')}
        error={fieldErrors.email}
        autoComplete="email"
        required
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setErrorMessage(null);
        }}
        onBlur={() => applyFieldValidation('password')}
        error={fieldErrors.password}
        autoComplete="current-password"
        required
      />

      <Button type="submit" loading={submitting} disabled={isSubmitDisabled}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </Button>

      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
      <p className="pageMuted">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </Card>
  );
}
