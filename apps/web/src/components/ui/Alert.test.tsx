import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders by tone with optional title', () => {
    render(
      <Alert tone="warning" title="Warning">
        Check your inputs.
      </Alert>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('uiAlert');
    expect(alert).toHaveClass('uiAlert--warning');
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Check your inputs.')).toBeInTheDocument();
  });

  it('renders content body without title', () => {
    render(<Alert tone="info">All good.</Alert>);
    expect(screen.getByRole('status')).toHaveClass('uiAlert--info');
    expect(screen.getByText('All good.')).toBeInTheDocument();
  });
});
