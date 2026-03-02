import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders with default classes', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    expect(button).toHaveClass('uiButton');
    expect(button).toHaveClass('uiButton--primary');
    expect(button).toHaveClass('uiButton--md');
  });

  it('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveClass('uiButton--danger');
    expect(button).toHaveClass('uiButton--lg');
  });

  it('disables when loading or disabled', () => {
    const { rerender } = render(
      <Button loading>{'Submitting...'}</Button>
    );

    let button = screen.getByRole('button', { name: 'Submitting...' });
    expect(button).toBeDisabled();
    expect(button).toHaveClass('isLoading');

    rerender(<Button disabled>{'Disabled'}</Button>);
    button = screen.getByRole('button', { name: 'Disabled' });
    expect(button).toBeDisabled();
  });
});
