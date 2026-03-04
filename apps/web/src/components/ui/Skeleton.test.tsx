import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders with default classes and line count', () => {
    render(<Skeleton data-testid="skeleton" />);
    const skeleton = screen.getByTestId('skeleton');

    expect(skeleton).toHaveClass('uiSkeleton');
    expect(skeleton).toHaveClass('uiSkeleton--text');
    expect(skeleton).toHaveClass('uiSkeletonPulse');
    expect(skeleton.querySelectorAll('.uiSkeletonLine')).toHaveLength(3);
  });

  it('applies variant modifiers and merges custom classes', () => {
    render(<Skeleton data-testid="skeleton" variant="card" className="customClass" />);
    const skeleton = screen.getByTestId('skeleton');

    expect(skeleton).toHaveClass('uiSkeleton--card');
    expect(skeleton).toHaveClass('customClass');
    expect(skeleton.querySelectorAll('.uiSkeletonLine')).toHaveLength(3);
  });

  it('respects custom text line count', () => {
    render(<Skeleton data-testid="skeleton" lines={5} />);
    const skeleton = screen.getByTestId('skeleton');

    expect(skeleton.querySelectorAll('.uiSkeletonLine')).toHaveLength(5);
  });

  it('uses deterministic preset line count for page variant', () => {
    render(<Skeleton data-testid="skeleton" variant="page" lines={2} />);
    const skeleton = screen.getByTestId('skeleton');

    expect(skeleton).toHaveClass('uiSkeleton--page');
    expect(skeleton.querySelectorAll('.uiSkeletonLine')).toHaveLength(4);
  });
});
