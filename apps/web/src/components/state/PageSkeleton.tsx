import React from 'react';

type PageSkeletonVariant = 'home' | 'catalog' | 'learn' | 'auth';

type PageSkeletonProps = {
  variant: PageSkeletonVariant;
};

export function PageSkeleton({ variant }: PageSkeletonProps) {
  return (
    <main className={`pageShell stateSkeleton ${variant}Skeleton`} data-variant={variant}>
      <div className="stateSkeletonBlock stateSkeletonPulse">
        <div className="stateSkeletonLine stateSkeletonLine--lg" />
        <div className="stateSkeletonLine stateSkeletonLine--md" />
      </div>
      <div className="stateSkeletonBlock stateSkeletonPulse">
        <div className="stateSkeletonLine stateSkeletonLine--md" />
        <div className="stateSkeletonLine stateSkeletonLine--sm" />
        <div className="stateSkeletonLine stateSkeletonLine--sm" />
      </div>
      {variant !== 'auth' ? (
        <div className="stateSkeletonBlock stateSkeletonPulse">
          <div className="stateSkeletonLine stateSkeletonLine--md" />
          <div className="stateSkeletonLine stateSkeletonLine--sm" />
        </div>
      ) : null}
    </main>
  );
}
