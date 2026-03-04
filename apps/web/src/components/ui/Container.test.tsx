import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Container } from './Container';

describe('Container', () => {
  it('renders with default classes', () => {
    render(<Container data-testid="container">Content</Container>);
    const container = screen.getByTestId('container');

    expect(container).toHaveClass('uiContainer');
    expect(container).toHaveClass('uiContainer--content');
  });

  it('applies size variant and merges custom classes', () => {
    render(
      <Container data-testid="container" size="wide" className="customClass">
        Content
      </Container>
    );
    const container = screen.getByTestId('container');

    expect(container).toHaveClass('uiContainer--wide');
    expect(container).toHaveClass('customClass');
  });

  it('supports polymorphic rendering with as prop', () => {
    render(
      <Container as="main" data-testid="container">
        Content
      </Container>
    );

    expect(screen.getByTestId('container').tagName).toBe('MAIN');
  });
});
