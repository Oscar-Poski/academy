import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StateCard } from './StateCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe('StateCard', () => {
  it('renders title and message by kind', () => {
    render(<StateCard kind="empty" title="Nothing here" message="No records found." />);

    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
    expect(screen.getByText('No records found.')).toBeInTheDocument();
  });

  it('renders link action when href action is provided', () => {
    render(
      <StateCard
        kind="info"
        title="Need help?"
        action={{ label: 'Go home', href: '/' }}
      />
    );

    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders button action and executes handler', () => {
    const onAction = vi.fn();

    render(
      <StateCard
        kind="error"
        title="Failed"
        action={{ label: 'Retry', onAction }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
