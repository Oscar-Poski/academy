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
import { microcopy } from '@/src/lib/copy/microcopy';
import { getAuthErrorMessage } from '@/src/lib/errors/error-messages';

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
        setErrorMessage(getAuthErrorMessage(payload, microcopy.auth.errors.invalidCredentials));
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setErrorMessage(microcopy.auth.errors.signInUnavailable);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card as="form" className="playerCard pageCard authForm" onSubmit={onSubmit}>
      <header className="authFormHeader">
        <h1 className="authFormTitle">{microcopy.auth.headings.logIn}</h1>
        <p className="pageMuted authFormDescription">{microcopy.auth.descriptions.logIn}</p>
      </header>

      <div className="authFormFields">
        <Input
          id="login-email"
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
          id="login-password"
          label={microcopy.auth.fields.password}
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
      </div>

      <div className="authFormFooter">
        <Button type="submit" loading={submitting} disabled={isSubmitDisabled}>
          {submitting ? microcopy.auth.buttons.loggingIn : microcopy.auth.buttons.logIn}
        </Button>
        {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
        <p className="pageMuted authFormLinkRow">
          {microcopy.auth.links.needAccountPrefix} <Link href="/signup">{microcopy.auth.links.needAccountAction}</Link>
        </p>
      </div>
    </Card>
  );
}
