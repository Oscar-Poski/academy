import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
  it('renders deterministic home skeleton variant', () => {
    const { container } = render(<PageSkeleton variant="home" />);
    expect(container.querySelector('.uiSkeletonPage--home')).toBeTruthy();
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('data-variant', 'home');
    expect(main).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Cargando contenido de la página');
    const hiddenBlocks = container.querySelectorAll('.uiSkeleton--card[aria-hidden="true"]');
    expect(hiddenBlocks).toHaveLength(3);
  });

  it('renders auth skeleton with deterministic structure', () => {
    const { container } = render(<PageSkeleton variant="auth" />);
    expect(container.querySelector('.uiSkeletonPage--auth')).toBeTruthy();
    expect(container.querySelectorAll('.uiSkeleton--card')).toHaveLength(2);
  });
});
