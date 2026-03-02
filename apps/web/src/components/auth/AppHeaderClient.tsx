'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonClassName } from '@/src/components/ui';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { LogoutButton } from './LogoutButton';

type AppHeaderClientProps = {
  sessionProfile: SessionProfile;
  appName: string;
};

export function AppHeaderClient({ sessionProfile, appName }: AppHeaderClientProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelId = 'app-header-menu-panel';
  const homeLinkClass = `appNavLink${pathname === '/' ? ' appNavLink--active' : ''}`;
  const authLinkClass = buttonClassName({
    variant: 'secondary',
    size: 'sm',
    className: 'appAuthAction'
  });

  function closeMenu(): void {
    setMenuOpen(false);
  }

  return (
    <>
      <Link href="/" className="appBrand" onClick={closeMenu}>
        {appName}
      </Link>
      <nav className="appHeaderMainNav appNav" aria-label="Primary navigation">
        <button
          type="button"
          className="appHeaderMenuButton"
          aria-expanded={menuOpen}
          aria-controls={menuPanelId}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? 'Close menu' : 'Menu'}
        </button>
        <div
          id={menuPanelId}
          data-testid={menuPanelId}
          className={`appHeaderMenuPanel${menuOpen ? ' isOpen' : ''}`}
          data-open={menuOpen ? 'true' : 'false'}
        >
          <div className="appNavPrimary">
            <Link href="/" className={homeLinkClass} onClick={closeMenu}>
              Home
            </Link>
          </div>
          <div className="appNavSecondary">
            {sessionProfile.authenticated ? (
              <>
                <span className="appAuthText">{sessionProfile.user.email}</span>
                <LogoutButton onAction={closeMenu} />
              </>
            ) : (
              <>
                <Link href="/login" className={authLinkClass} onClick={closeMenu}>
                  Log in
                </Link>
                <Link href="/signup" className={authLinkClass} onClick={closeMenu}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
