import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PathLoading from './loading';

describe('path loading', () => {
  it('renders catalog skeleton variant', () => {
    render(<PathLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'catalog');
  });
});
