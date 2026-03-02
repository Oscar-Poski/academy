import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineNotice } from './InlineNotice';

describe('InlineNotice', () => {
  it('renders info notice by default', () => {
    const { container } = render(<InlineNotice message="Info message" />);
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(container.querySelector('.stateInlineNotice--info')).toBeTruthy();
  });

  it('renders warning tone class when provided', () => {
    const { container } = render(<InlineNotice tone="warning" message="Warning message" />);
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(container.querySelector('.stateInlineNotice--warning')).toBeTruthy();
  });
});
