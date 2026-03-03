import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PathTreeModule } from '@/src/lib/content-types';
import type { PathModuleProgressItem } from '@/src/lib/progress-types';
import { PathModuleCard } from './PathModuleCard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

const moduleBase: PathTreeModule = {
  id: 'module-1',
  slug: 'http-basics',
  title: 'HTTP Basics',
  sortOrder: 1,
  sections: [
    {
      id: 'section-1',
      slug: 'methods',
      title: 'HTTP Methods',
      sortOrder: 1
    }
  ]
};

const moduleProgress: PathModuleProgressItem = {
  moduleId: 'module-1',
  completionPct: 50,
  completedSections: 1,
  totalSections: 2
};

describe('PathModuleCard', () => {
  it('renders unlocked module card with module/section actions and progress chip', () => {
    render(<PathModuleCard module={moduleBase} moduleProgress={moduleProgress} />);

    expect(screen.getByRole('heading', { name: 'HTTP Basics' })).toBeInTheDocument();
    expect(screen.getByText('50% · 1/2 secciones')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir módulo' })).toHaveAttribute('href', '/modules/module-1');
    expect(screen.getByRole('link', { name: 'Comenzar' })).toHaveAttribute('href', '/learn/section-1');
  });

  it('renders lock reason and disabled CTA for locked module', () => {
    const lockedModule: PathTreeModule = {
      ...moduleBase,
      lock: {
        isLocked: true,
        reasons: ['Complete module prerequisites'],
        requiresCredits: false,
        creditsCost: 0
      }
    };

    render(<PathModuleCard module={lockedModule} />);

    expect(screen.getByText('Complete module prerequisites')).toBeInTheDocument();
    const lockedAction = screen.getAllByText('Bloqueado').find((node) =>
      node.classList.contains('catalogPrimaryCta')
    );
    expect(lockedAction).toBeDefined();
    expect(lockedAction).toHaveClass('isDisabled');
    expect(screen.queryByRole('link', { name: 'Abrir módulo' })).not.toBeInTheDocument();
  });

  it('renders empty-state notice when module has no sections', () => {
    render(<PathModuleCard module={{ ...moduleBase, sections: [] }} />);
    expect(screen.getByText('Aún no hay secciones en este módulo.')).toBeInTheDocument();
  });
});
