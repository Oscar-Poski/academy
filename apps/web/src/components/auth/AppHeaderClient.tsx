'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { buttonClassName } from '@/src/components/ui';
import { microcopy } from '@/src/lib/copy/microcopy';
import type { SessionProfile } from '@/src/lib/auth/get-session-profile.server';
import { LogoutButton } from './LogoutButton';

type AppHeaderClientProps = {
  sessionProfile: SessionProfile;
  appName: string;
};

export function AppHeaderClient({ sessionProfile, appName }: AppHeaderClientProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuPanelId = 'app-header-menu-panel';
  const homeLinkClass = `appNavLink${pathname === '/' ? ' appNavLink--active' : ''}`;
  const coursesLinkClass = `appNavLink${pathname === '/courses' ? ' appNavLink--active' : ''}`;
  const authLinkClass = buttonClassName({
    variant: 'secondary',
    size: 'sm',
    className: 'appAuthAction'
  });

  function closeMenu({ restoreFocus = false }: { restoreFocus?: boolean } = {}): void {
    setMenuOpen(false);
    if (restoreFocus) {
      menuButtonRef.current?.focus();
    }
  }

  function handleMenuToggle(): void {
    if (menuOpen) {
      closeMenu({ restoreFocus: true });
      return;
    }

    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const panel = menuPanelRef.current;
    if (!panel) {
      return;
    }

    const firstAction = panel.querySelector<HTMLElement>('a[href],button:not([disabled])');
    firstAction?.focus();
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handleKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
    };
  }, [menuOpen]);

  return (
    <>
      <Link
        href="/"
        className="appBrand"
        onClick={() => {
          closeMenu();
        }}
      >
        {appName}
      </Link>
      <nav className="appHeaderMainNav appNav" aria-label={microcopy.nav.primaryNavigationAriaLabel}>
        <button
          ref={menuButtonRef}
          type="button"
          className="appHeaderMenuButton"
          aria-expanded={menuOpen}
          aria-controls={menuPanelId}
          onClick={handleMenuToggle}
        >
          {menuOpen ? microcopy.nav.closeMenu : microcopy.nav.menu}
        </button>
        <div
          ref={menuPanelRef}
          id={menuPanelId}
          data-testid={menuPanelId}
          className={`appHeaderMenuPanel${menuOpen ? ' isOpen' : ''}`}
          data-open={menuOpen ? 'true' : 'false'}
        >
          <div className="appNavPrimary">
            <Link
              href="/"
              className={homeLinkClass}
              onClick={() => {
                closeMenu();
              }}
            >
              {microcopy.nav.home}
            </Link>
            <Link
              href="/courses"
              className={coursesLinkClass}
              onClick={() => {
                closeMenu();
              }}
            >
              {microcopy.nav.courses}
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
                <Link
                  href="/login"
                  className={authLinkClass}
                  onClick={() => {
                    closeMenu();
                  }}
                >
                  {microcopy.auth.actions.logIn}
                </Link>
                <Link
                  href="/signup"
                  className={authLinkClass}
                  onClick={() => {
                    closeMenu();
                  }}
                >
                  {microcopy.auth.actions.signUp}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
