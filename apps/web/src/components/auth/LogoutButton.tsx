'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onLogout() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
    } catch {
      // Logout route clears session cookies; redirect regardless of transient fetch failures.
    } finally {
      router.push('/login');
      router.refresh();
      setSubmitting(false);
    }
  }

  return (
    <button type="button" className="appAuthAction" onClick={onLogout} disabled={submitting}>
      {submitting ? 'Logging out...' : 'Log out'}
    </button>
  );
}
