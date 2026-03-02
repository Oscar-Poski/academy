import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('renders with default variant/padding classes', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');

    expect(card).toHaveClass('uiCard');
    expect(card).toHaveClass('uiCard--surface');
    expect(card).toHaveClass('uiCard--pad-md');
  });

  it('supports alternate variant/padding', () => {
    render(
      <Card data-testid="card" variant="outlined" padding="lg">
        Content
      </Card>
    );
    const card = screen.getByTestId('card');

    expect(card).toHaveClass('uiCard--outlined');
    expect(card).toHaveClass('uiCard--pad-lg');
  });
});
