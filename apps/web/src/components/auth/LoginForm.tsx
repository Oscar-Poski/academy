'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

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
    <form className="playerCard pageCard" onSubmit={onSubmit}>
      <h1>Sign In</h1>
      <p className="pageMuted">Use your Academy credentials to continue learning.</p>

      <label className="pageLabel" htmlFor="login-email">
        Email
      </label>
      <input
        id="login-email"
        className="pageInput"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />

      <label className="pageLabel" htmlFor="login-password">
        Password
      </label>
      <input
        id="login-password"
        className="pageInput"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />

      <button type="submit" className="pageActionLink" disabled={submitting}>
        {submitting ? 'Signing in...' : 'Sign in'}
      </button>

      {errorMessage ? <p className="playerFooterError">{errorMessage}</p> : null}
    </form>
  );
}
