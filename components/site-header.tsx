'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { siteConfig } from '@/lib/constants';
import { ThemeToggler } from '@/components/theme-toggler';

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="container-shell site-header__inner">
        <Link href="/" className="site-header__brand" aria-label="Northfield Journal home">
          <div className="display-font site-header__title">
            Northfield <span className="site-header__title-accent">Journal</span>
          </div>
          <p className="site-header__tagline">Thoughtful education coverage</p>
        </Link>

        <button
          type="button"
          className="site-header__menu-toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        <div
          id="site-navigation"
          className={menuOpen ? 'site-header__drawer site-header__drawer--open' : 'site-header__drawer'}
        >
          <nav className="site-header__nav" aria-label="Primary navigation">
            {siteConfig.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={pathname === item.href ? 'site-header__nav-link site-header__nav-link--active' : 'site-header__nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="site-header__actions">
            <ThemeToggler />

            <Link href="/guest-post" className="button-secondary site-header__submit-link">
              Submit a piece
            </Link>

            <Link href="/admin/login" className="button-primary site-header__login-link">
              Editor login
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
