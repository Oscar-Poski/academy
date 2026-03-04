'use client';

import React from 'react';
import { StateCard } from '@/src/components/state';
import { Container } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalErrorPage({ reset }: ErrorPageProps) {
  return (
    <Container as="main" size="content">
      <StateCard
        kind="error"
        titleAs="h1"
        title={microcopy.state.globalError.title}
        message={microcopy.state.globalError.message}
        action={{
          label: microcopy.state.globalError.tryAgain,
          onAction: reset
        }}
      />
      <StateCard
        kind="info"
        title={microcopy.state.globalError.safeRouteTitle}
        message={microcopy.state.globalError.safeRouteMessage}
        action={{
          label: microcopy.nav.home,
          href: '/'
        }}
      />
    </Container>
  );
}
