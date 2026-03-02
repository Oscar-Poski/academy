import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CatalogLockNotice } from './CatalogLockNotice';

describe('CatalogLockNotice', () => {
  it('renders locked badge and reason', () => {
    render(<CatalogLockNotice reason="Complete prerequisite section first." />);

    expect(screen.getByText('Locked')).toHaveClass('lockBadge', 'lockBadge--locked');
    expect(screen.getByText('Complete prerequisite section first.')).toHaveClass('catalogLockReason');
  });

  it('appends optional className on wrapper', () => {
    const { container } = render(<CatalogLockNotice reason="Locked for now." className="extraClass" />);
    expect(container.firstChild).toHaveClass('catalogLockNotice', 'extraClass');
  });
});
