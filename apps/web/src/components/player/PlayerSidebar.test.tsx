import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PathTree } from '@/src/lib/content-types';
import { PlayerSidebar } from './PlayerSidebar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

describe('PlayerSidebar', () => {
  const pathTree: PathTree = {
    id: 'path-1',
    slug: 'web-foundations',
    title: 'Web Foundations',
    description: null,
    modules: [
      {
        id: 'module-1',
        slug: 'http-basics',
        title: 'HTTP Basics',
        sortOrder: 1,
        sections: [
          {
            id: 'section-1',
            slug: 'intro',
            title: 'Intro',
            sortOrder: 1
          },
          {
            id: 'section-2',
            slug: 'verbs',
            title: 'HTTP Verbs',
            sortOrder: 2,
            lock: {
              isLocked: true,
              reasons: ['Pass the quiz first'],
              requiresCredits: false,
              creditsCost: 0
            }
          }
        ]
      },
      {
        id: 'module-2',
        slug: 'advanced',
        title: 'Advanced',
        sortOrder: 2,
        lock: {
          isLocked: true,
          reasons: ['Complete previous module'],
          requiresCredits: false,
          creditsCost: 0
        },
        sections: [
          {
            id: 'section-3',
            slug: 'advanced-intro',
            title: 'Advanced Intro',
            sortOrder: 1
          }
        ]
      }
    ]
  };

  it('renders sidebar card with active module/section states', () => {
    const { container } = render(<PlayerSidebar pathTree={pathTree} currentSectionId="section-1" />);

    const sidebar = screen.getByRole('complementary', { name: 'Navegación del curso' });
    expect(sidebar).toHaveClass('playerSidebar', 'playerSidebarCard');

    const activeModule = container.querySelector('.playerTreeModule.playerSidebarActiveModule');
    expect(activeModule).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Intro' })).toHaveClass('playerSidebarActiveSection');
  });

  it('renders unlocked links and locked states with reasons', () => {
    render(<PlayerSidebar pathTree={pathTree} currentSectionId="section-1" />);

    expect(screen.getByRole('link', { name: 'HTTP Basics' })).toHaveAttribute('href', '/modules/module-1');
    expect(screen.getByRole('link', { name: 'Intro' })).toHaveAttribute('href', '/learn/section-1');
    expect(screen.queryByRole('link', { name: 'HTTP Verbs' })).not.toBeInTheDocument();
    expect(screen.getByText('HTTP Verbs')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Advanced' })).not.toBeInTheDocument();
    expect(screen.getByText('Complete previous module')).toBeInTheDocument();
  });
});
