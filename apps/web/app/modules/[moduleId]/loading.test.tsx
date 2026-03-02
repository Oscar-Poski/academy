import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ModuleLoading from './loading';

describe('module loading', () => {
  it('renders catalog skeleton variant', () => {
    render(<ModuleLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'catalog');
  });
});
