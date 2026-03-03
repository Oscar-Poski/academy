'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Alert, Button, Card, Input } from '@/src/components/ui';
import type { AuthApiError } from '@/src/lib/auth/types';
import { safeNextPath } from '@/src/lib/auth/safe-next-path';
import type { AuthFieldErrors } from '@/src/lib/auth/form-validation';
import { validateSignupInput } from '@/src/lib/auth/form-validation';
import { microcopy } from '@/src/lib/copy/microcopy';
import { getAuthErrorMessage } from '@/src/lib/errors/error-messages';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'), '/');

  const [name, setName] = useState('New Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentErrors = validateSignupInput({ name, email, password });
  const isValid = Object.keys(currentErrors).length === 0;
  const isSubmitDisabled = submitting || !isValid;

  function applyFieldValidation(field: 'name' | 'email' | 'password'): void {
    const nextErrors = validateSignupInput({ name, email, password });
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
      return;
    }

    const validationErrors = validateSignupInput({ name, email, password });
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setErrorMessage(null);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as AuthApiError | null;
        setErrorMessage(getAuthErrorMessage(payload, microcopy.auth.errors.signUpUnavailable));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setErrorMessage(microcopy.auth.errors.signUpUnavailable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="form" className="playerCard pageCard" onSubmit={onSubmit}>
      <h1>{microcopy.auth.headings.signUp}</h1>
      <p className="pageMuted">{microcopy.auth.descriptions.signUp}</p>

      <Input
        id="signup-name"
        label={microcopy.auth.fields.name}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          setErrorMessage(null);
        }}
        onBlur={() => applyFieldValidation('name')}
        error={fieldErrors.name}
        autoComplete="name"
        required
      />

      <Input
        id="signup-email"
        label={microcopy.auth.fields.email}
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
        id="signup-password"
        label={microcopy.auth.fields.password}
        type="password"
        value={password}
        onChange={(event) => {
          setPassword(event.target.value);
          setErrorMessage(null);
        }}
        onBlur={() => applyFieldValidation('password')}
        error={fieldErrors.password}
        autoComplete="new-password"
        required
      />

      <Button type="submit" loading={submitting} disabled={isSubmitDisabled}>
        {submitting ? microcopy.auth.buttons.signingUp : microcopy.auth.buttons.signUp}
      </Button>

      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
      <p className="pageMuted">
        {microcopy.auth.links.alreadyHaveAccountPrefix}{' '}
        <Link href="/login">{microcopy.auth.links.alreadyHaveAccountAction}</Link>
      </p>
    </Card>
  );
}
