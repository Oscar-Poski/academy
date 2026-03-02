'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type LogoutButtonProps = {
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onAction?: () => void;
};

export function LogoutButton({
  className = 'appAuthAction',
  variant = 'secondary',
  size = 'sm',
  onAction
}: LogoutButtonProps = {}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onLogout() {
    if (submitting) {
      return;
    }

    onAction?.();
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
      variant={variant}
      size={size}
      className={className}
      onClick={onLogout}
      loading={submitting}
    >
      {submitting ? microcopy.auth.buttons.loggingOut : microcopy.auth.actions.logOut}
    </Button>
  );
}
