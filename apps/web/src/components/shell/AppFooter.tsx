import React from 'react';
import Link from 'next/link';
import { APP_NAME } from '@academy/shared';
import { buttonClassName } from '@/src/components/ui';
import { LogoutButton } from '@/src/components/auth/LogoutButton';
import { microcopy } from '@/src/lib/copy/microcopy';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';

type AppFooterProps = {
  sessionProfile: SessionProfile;
};

export function AppFooter({ sessionProfile }: AppFooterProps) {
  const actionClassName = buttonClassName({
    variant: 'ghost',
    size: 'sm',
    className: 'appAuthAction appFooterAction'
  });
  const year = new Date().getFullYear();

  return (
    <footer className="appFooter">
      <div className="appFooterInner">
        <p className="appFooterMeta">
          {APP_NAME} · {year}
        </p>
        <nav className="appFooterNav" aria-label="Footer navigation">
          <Link href="/" className="appNavLink">
            {microcopy.nav.home}
          </Link>
          {sessionProfile.authenticated ? (
            <LogoutButton variant="ghost" size="sm" className="appAuthAction appFooterAction" />
          ) : (
            <>
              <Link href="/login" className={actionClassName}>
                {microcopy.auth.actions.logIn}
              </Link>
              <Link href="/signup" className={actionClassName}>
                {microcopy.auth.actions.signUp}
              </Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
}
