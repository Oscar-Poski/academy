'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

type RegisterError = {
  code?: string;
  message?: string;
};

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [name, setName] = useState('New Student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as RegisterError | null;
        setErrorMessage(payload?.message ?? 'Unable to create account right now. Try again.');
        return;
      }

      router.push(nextPath);
      router.refresh();
    } catch {
      setErrorMessage('Unable to create account right now. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="playerCard pageCard" onSubmit={onSubmit}>
      <h1>Create Account</h1>
      <p className="pageMuted">Create your Academy account to start learning.</p>

      <label className="pageLabel" htmlFor="signup-name">
        Name
      </label>
      <input
        id="signup-name"
        className="pageInput"
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="name"
        required
      />

      <label className="pageLabel" htmlFor="signup-email">
        Email
      </label>
      <input
        id="signup-email"
        className="pageInput"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        autoComplete="email"
        required
      />

      <label className="pageLabel" htmlFor="signup-password">
        Password
      </label>
      <input
        id="signup-password"
        className="pageInput"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        required
      />

      <button type="submit" className="pageActionLink" disabled={submitting}>
        {submitting ? 'Creating account...' : 'Create account'}
      </button>

      {errorMessage ? <p className="playerFooterError">{errorMessage}</p> : null}
      <p className="pageMuted">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
