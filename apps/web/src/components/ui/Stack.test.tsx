import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Stack } from './Stack';

describe('Stack', () => {
  it('renders with default classes', () => {
    render(<Stack data-testid="stack">Content</Stack>);
    const stack = screen.getByTestId('stack');

    expect(stack).toHaveClass('uiStack');
    expect(stack).toHaveClass('uiStack--md');
  });

  it('applies gap variant and merges custom classes', () => {
    render(
      <Stack data-testid="stack" gap="lg" className="customClass">
        Content
      </Stack>
    );
    const stack = screen.getByTestId('stack');

    expect(stack).toHaveClass('uiStack--lg');
    expect(stack).toHaveClass('customClass');
  });

  it('supports polymorphic rendering with as prop', () => {
    render(
      <Stack as="ul" data-testid="stack">
        <li>Item</li>
      </Stack>
    );

    expect(screen.getByTestId('stack').tagName).toBe('UL');
  });
});
