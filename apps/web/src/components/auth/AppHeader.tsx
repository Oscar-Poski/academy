import React from 'react';
import { APP_NAME } from '@academy/shared';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { AppHeaderClient } from './AppHeaderClient';

type AppHeaderProps = {
  sessionProfile: SessionProfile;
};

export function AppHeader({ sessionProfile }: AppHeaderProps) {
  return (
    <header className="appHeader">
      <div className="appHeaderInner">
        <AppHeaderClient sessionProfile={sessionProfile} appName={APP_NAME} />
      </div>
    </header>
  );
}
