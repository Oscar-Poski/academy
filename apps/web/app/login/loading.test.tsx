import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginLoading from './loading';

describe('login loading', () => {
  it('renders auth skeleton variant', () => {
    render(<LoginLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'auth');
  });
});
