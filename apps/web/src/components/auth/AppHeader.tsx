import React from 'react';
import Link from 'next/link';
import { APP_NAME } from '@academy/shared';
import { LogoutButton } from './LogoutButton';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { buttonClassName } from '@/src/components/ui';

type AppHeaderProps = {
  sessionProfile: SessionProfile;
};

export function AppHeader({ sessionProfile }: AppHeaderProps) {
  const authLinkClass = buttonClassName({
    variant: 'secondary',
    size: 'sm',
    className: 'appAuthAction'
  });

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
              <Link href="/login" className={authLinkClass}>
                Log in
              </Link>
              <Link href="/signup" className={authLinkClass}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
