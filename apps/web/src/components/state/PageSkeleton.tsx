import React from 'react';
import { Container } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';

type PageSkeletonVariant = 'home' | 'catalog' | 'learn' | 'auth';

type PageSkeletonProps = {
  variant: PageSkeletonVariant;
};

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <Container
      as="main"
      size="content"
      className={`stateSkeleton ${variant}Skeleton`}
      data-variant={variant}
      aria-busy="true"
    >
      <p className="stateSrOnly" role="status" aria-live="polite">
        {microcopy.state.loadingPage}
      </p>
      <div className="stateSkeletonBlock stateSkeletonPulse" aria-hidden="true">
        <div className="stateSkeletonLine stateSkeletonLine--lg" />
        <div className="stateSkeletonLine stateSkeletonLine--md" />
      </div>
      <div className="stateSkeletonBlock stateSkeletonPulse" aria-hidden="true">
        <div className="stateSkeletonLine stateSkeletonLine--md" />
        <div className="stateSkeletonLine stateSkeletonLine--sm" />
        <div className="stateSkeletonLine stateSkeletonLine--sm" />
      </div>
      {variant !== 'auth' ? (
        <div className="stateSkeletonBlock stateSkeletonPulse" aria-hidden="true">
          <div className="stateSkeletonLine stateSkeletonLine--md" />
          <div className="stateSkeletonLine stateSkeletonLine--sm" />
        </div>
      ) : null}
    </Container>
  );
}
