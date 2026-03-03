import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogProgressChip } from './CatalogProgressChip';

describe('CatalogProgressChip', () => {
  it('renders status-driven chip with mapped label/class', () => {
    render(<CatalogProgressChip status="in_progress" />);

    expect(screen.getByText('En progreso')).toHaveClass('progressBadge', 'progressBadge--inProgress');
  });

  it('renders generic label chip', () => {
    render(<CatalogProgressChip label="42% completado" />);

    expect(screen.getByText('42% completado')).toHaveClass('progressBadge');
  });
});
