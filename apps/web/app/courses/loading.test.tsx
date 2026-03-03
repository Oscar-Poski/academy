import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CoursesLoading from './loading';

describe('courses loading', () => {
  it('renders catalog skeleton variant', () => {
    render(<CoursesLoading />);
    expect(screen.getByRole('main')).toHaveAttribute('data-variant', 'catalog');
  });
});
