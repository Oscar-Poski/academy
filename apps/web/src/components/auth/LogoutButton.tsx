'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui';

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
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="appAuthAction"
      onClick={onLogout}
      loading={submitting}
    >
      {submitting ? 'Logging out...' : 'Log out'}
    </Button>
  );
}
