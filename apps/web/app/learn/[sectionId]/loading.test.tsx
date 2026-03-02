import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LearnLoading from './loading';

describe('learn loading', () => {
  it('renders learn skeleton variant', () => {
    render(<LearnLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'learn');
  });
});
