import React from 'react';
import { Container, Skeleton } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type PageSkeletonVariant = 'home' | 'catalog' | 'learn' | 'auth';

type PageSkeletonProps = {
  variant: PageSkeletonVariant;
};

export function PageSkeleton({ variant }: PageSkeletonProps) {
  const blockCount = variant === 'auth' ? 2 : 3;

  return (
    <Container as="main" size="content" className={`uiSkeletonPage uiSkeletonPage--${variant}`} data-variant={variant} aria-busy="true">
      <p className="stateSrOnly" role="status" aria-live="polite">
        {microcopy.state.loadingPage}
      </p>
      {Array.from({ length: blockCount }).map((_, index) => (
        <Skeleton key={index} variant="card" aria-hidden="true" />
      ))}
    </Container>
  );
}
