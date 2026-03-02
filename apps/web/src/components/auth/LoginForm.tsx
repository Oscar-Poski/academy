'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Card, Input } from '@/src/components/ui';

type LoginError = {
  code?: string;
  message?: string;
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [email, setEmail] = useState('student@academy.local');
  const [password, setPassword] = useState('password123');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) {
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
        const payload = (await response.json().catch(() => null)) as LoginError | null;
        setErrorMessage(payload?.message ?? 'Invalid email or password');
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
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />

      <Input
        id="login-password"
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />

      <Button type="submit" loading={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </Button>

      {errorMessage ? <Alert tone="danger">{errorMessage}</Alert> : null}
      <p className="pageMuted">
        New here? <Link href="/signup">Create an account</Link>
      </p>
    </Card>
  );
}
