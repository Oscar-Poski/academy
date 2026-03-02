import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AppLoading from './loading';

describe('app loading', () => {
  it('renders home skeleton variant', () => {
    render(<AppLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'home');
  });
});
