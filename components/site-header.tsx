import Link from 'next/link';
import { siteConfig } from '@/lib/constants';
import { ThemeToggler } from '@/components/theme-toggler';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container-shell site-header__inner">
        <Link href="/" className="site-header__brand">
          <div className="display-font site-header__title">
            Northfield <span className="site-header__title-accent">Journal</span>
          </div>
          <p className="site-header__tagline">Thoughtful education coverage</p>
        </Link>

        <nav className="site-header__nav">
          {siteConfig.nav.map((item) => (
            <Link key={item.href} href={item.href} className="site-header__nav-link">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="site-header__actions">
          <ThemeToggler />

          <Link href="/guest-post" className="button-secondary">
            Submit a piece
          </Link>

          <Link href="/admin/login" className="button-primary">
            Editor login
          </Link>
        </div>
      </div>
    </header>
  );
}