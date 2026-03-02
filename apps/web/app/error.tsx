'use client';

import React from 'react';
import { StateCard } from '@/src/components/state';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="pageShell">
      <StateCard
        kind="error"
        title="Something went wrong"
        message="The page failed to load. You can retry now or return home."
        action={{
          label: 'Try again',
          onAction: reset
        }}
      />
      <StateCard
        kind="info"
        title="Need a safe route?"
        message="Go back to the home page."
        action={{
          label: 'Home',
          href: '/'
        }}
      />
    </main>
  );
}
