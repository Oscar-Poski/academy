import React from 'react';
import Link from 'next/link';
import { APP_NAME } from '@academy/shared';
import { LogoutButton } from './LogoutButton';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';

type AppHeaderProps = {
  sessionProfile: SessionProfile;
};

export function AppHeader({ sessionProfile }: AppHeaderProps) {
  return (
    <header className="appHeader">
      <div className="appHeaderInner">
        <Link href="/" className="appBrand">
          {APP_NAME}
        </Link>
        <nav className="appNav" aria-label="Authentication">
          {sessionProfile.authenticated ? (
            <>
              <span className="appAuthText">{sessionProfile.user.email}</span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="appAuthAction">
                Log in
              </Link>
              <Link href="/signup" className="appAuthAction">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
