import React from 'react';
import { render, screen } from '@testing-library/react';
import { APP_NAME } from '@academy/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

const appHeaderClientMock = vi.fn();

vi.mock('./AppHeaderClient', () => ({
  AppHeaderClient: (props: { sessionProfile: unknown; appName: string }) => {
    appHeaderClientMock(props);
    return <div data-testid="app-header-client" />;
  }
}));

describe('AppHeader', () => {
  beforeEach(() => {
    appHeaderClientMock.mockClear();
  });

  it('passes app name and anonymous session profile to client header', () => {
    render(<AppHeader sessionProfile={{ authenticated: false }} />);

    expect(screen.getByTestId('app-header-client')).toBeInTheDocument();
    expect(appHeaderClientMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appName: APP_NAME,
        sessionProfile: { authenticated: false }
      })
    );
  });

  it('passes authenticated session profile to client header', () => {
    render(
      <AppHeader
        sessionProfile={{
          authenticated: true,
          user: {
            id: 'u1',
            email: 'student@academy.local',
            name: 'Student',
            role: 'user'
          }
        }}
      />
    );

    expect(appHeaderClientMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        appName: APP_NAME,
        sessionProfile: {
          authenticated: true,
          user: {
            id: 'u1',
            email: 'student@academy.local',
            name: 'Student',
            role: 'user'
          }
        }
      })
    );
  });
});
