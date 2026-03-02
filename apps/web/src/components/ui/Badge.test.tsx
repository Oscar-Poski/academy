import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('applies tone and size classes', () => {
    render(
      <Badge tone="success" size="sm">
        Completed
      </Badge>
    );
    const badge = screen.getByText('Completed');

    expect(badge).toHaveClass('uiBadge');
    expect(badge).toHaveClass('uiBadge--success');
    expect(badge).toHaveClass('uiBadge--sm');
  });

  it('renders children text', () => {
    render(<Badge>In Progress</Badge>);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });
});
