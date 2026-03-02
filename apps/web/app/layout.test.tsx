import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSessionProfile, appHeaderMock, appFooterMock } = vi.hoisted(() => ({
  getSessionProfile: vi.fn(),
  appHeaderMock: vi.fn(),
  appFooterMock: vi.fn()
}));

vi.mock('@/src/lib/auth/get-session-profile.server', () => ({
  getSessionProfile
}));

vi.mock('@/src/components/auth/AppHeader', () => ({
  AppHeader: ({ sessionProfile }: { sessionProfile: unknown }) => {
    appHeaderMock(sessionProfile);
    return <div data-testid="app-header">Header</div>;
  }
}));

vi.mock('@/src/components/shell/AppFooter', () => ({
  AppFooter: ({ sessionProfile }: { sessionProfile: unknown }) => {
    appFooterMock(sessionProfile);
    return <div data-testid="app-footer">Footer</div>;
  }
}));

import RootLayout from './layout';

describe('RootLayout', () => {
  beforeEach(() => {
    getSessionProfile.mockReset();
    appHeaderMock.mockReset();
    appFooterMock.mockReset();
    getSessionProfile.mockResolvedValue({ authenticated: false });
  });

  it('renders shell with header, content slot, and footer', async () => {
    const layoutElement = await RootLayout({
      children: <div data-testid="layout-children">Content</div>
    });
    const bodyElement = layoutElement.props.children as React.ReactElement;
    render(<>{bodyElement.props.children}</>);

    expect(screen.getByTestId('app-header')).toBeInTheDocument();
    expect(screen.getByTestId('layout-children')).toBeInTheDocument();
    expect(screen.getByTestId('app-footer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#app-main-content');
  });

  it('passes resolved session profile to header and footer', async () => {
    const profile = {
      authenticated: true as const,
      user: {
        id: 'u1',
        email: 'student@academy.local',
        name: 'Student',
        role: 'user' as const
      }
    };
    getSessionProfile.mockResolvedValue(profile);

    const layoutElement = await RootLayout({ children: <div /> });
    const bodyElement = layoutElement.props.children as React.ReactElement;
    render(<>{bodyElement.props.children}</>);

    expect(getSessionProfile).toHaveBeenCalledTimes(1);
    expect(appHeaderMock).toHaveBeenCalledWith(profile);
    expect(appFooterMock).toHaveBeenCalledWith(profile);
  });
});
