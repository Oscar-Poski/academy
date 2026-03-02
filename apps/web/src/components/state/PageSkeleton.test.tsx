import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
  it('renders deterministic home skeleton variant', () => {
    const { container } = render(<PageSkeleton variant="home" />);
    expect(container.querySelector('.homeSkeleton')).toBeTruthy();
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'home');
  });

  it('renders auth skeleton with deterministic structure', () => {
    const { container } = render(<PageSkeleton variant="auth" />);
    expect(container.querySelector('.authSkeleton')).toBeTruthy();
    expect(container.querySelectorAll('.stateSkeletonBlock').length).toBe(2);
  });
});
