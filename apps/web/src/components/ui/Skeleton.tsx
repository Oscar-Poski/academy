import React from 'react';
import { cn } from '@/src/lib/ui/cn';

type SkeletonVariant = 'text' | 'card' | 'page';

export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: SkeletonVariant;
  lines?: number;
};

const lineStyles = ['lg', 'md', 'sm'] as const;

function resolveLineCount(variant: SkeletonVariant, lines: number): number {
  if (variant === 'text') {
    return Math.max(1, lines);
  }

  if (variant === 'card') {
    return 3;
  }

  return 4;
}

function getLineSize(index: number): (typeof lineStyles)[number] {
  return lineStyles[Math.min(index, lineStyles.length - 1)];
}

export function Skeleton({ variant = 'text', lines = 3, className, ...rest }: SkeletonProps) {
  const lineCount = resolveLineCount(variant, lines);

  return (
    <div className={cn('uiSkeleton', 'uiSkeletonPulse', `uiSkeleton--${variant}`, className)} {...rest}>
      {Array.from({ length: lineCount }).map((_, index) => (
        <div key={index} className={cn('uiSkeletonLine', `uiSkeletonLine--${getLineSize(index)}`)} />
      ))}
    </div>
  );
}
