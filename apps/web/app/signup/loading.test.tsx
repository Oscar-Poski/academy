import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignupLoading from './loading';

describe('signup loading', () => {
  it('renders auth skeleton variant', () => {
    render(<SignupLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'auth');
  });
});
