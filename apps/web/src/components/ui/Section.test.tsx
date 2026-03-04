import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Section } from './Section';

describe('Section', () => {
  it('renders with default classes', () => {
    render(<Section data-testid="section">Content</Section>);
    const section = screen.getByTestId('section');

    expect(section).toHaveClass('uiSection');
    expect(section).toHaveClass('uiSection--md');
    expect(section).toHaveClass('uiSection--none');
  });

  it('applies spacing and surface variants', () => {
    render(
      <Section data-testid="section" spacing="lg" surface="soft" className="customClass">
        Content
      </Section>
    );
    const section = screen.getByTestId('section');

    expect(section).toHaveClass('uiSection--lg');
    expect(section).toHaveClass('uiSection--soft');
    expect(section).toHaveClass('customClass');
  });

  it('supports polymorphic rendering with as prop', () => {
    render(
      <Section as="div" data-testid="section">
        Content
      </Section>
    );

    expect(screen.getByTestId('section').tagName).toBe('DIV');
  });
});
