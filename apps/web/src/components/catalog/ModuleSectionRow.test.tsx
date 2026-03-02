import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ModuleDetailSection } from '@/src/lib/content-types';
import { ModuleSectionRow } from './ModuleSectionRow';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

const baseSection: ModuleDetailSection = {
  id: 'section-1',
  slug: 'intro-http',
  title: 'Intro to HTTP',
  sortOrder: 1
};

describe('ModuleSectionRow', () => {
  it('renders unlocked not-started row with Start action', () => {
    render(<ModuleSectionRow section={baseSection} status="not_started" completionPct={0} showProgress />);

    expect(screen.getByText('Not Started')).toHaveClass('progressBadge--notStarted');
    expect(screen.getByRole('link', { name: 'Start' })).toHaveAttribute('href', '/learn/section-1');
  });

  it('renders in-progress row with Continue action and completion chip', () => {
    render(<ModuleSectionRow section={baseSection} status="in_progress" completionPct={37} showProgress />);

    expect(screen.getByText('In Progress')).toHaveClass('progressBadge--inProgress');
    expect(screen.getByText('37%')).toHaveClass('progressBadge');
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/learn/section-1');
  });

  it('renders completed row with Review action', () => {
    render(<ModuleSectionRow section={baseSection} status="completed" completionPct={100} showProgress />);

    expect(screen.getByText('Completed')).toHaveClass('progressBadge--completed');
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/learn/section-1');
  });

  it('renders locked row with disabled action', () => {
    const lockedSection: ModuleDetailSection = {
      ...baseSection,
      lock: {
        isLocked: true,
        reasons: ['Finish previous module'],
        requiresCredits: false,
        creditsCost: 0
      }
    };

    render(<ModuleSectionRow section={lockedSection} status="not_started" completionPct={0} showProgress />);

    expect(screen.getByText('Finish previous module')).toBeInTheDocument();
    const lockedAction = screen.getAllByText('Locked').find((node) =>
      node.classList.contains('catalogPrimaryCta')
    );
    expect(lockedAction).toBeDefined();
    expect(lockedAction).toHaveClass('isDisabled');
    expect(screen.queryByRole('link', { name: 'Start' })).not.toBeInTheDocument();
  });
});
