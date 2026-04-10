import Link from 'next/link';
import { siteConfig } from '@/lib/constants';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container-shell site-footer__top">
        <div>
          <p className="display-font site-footer__brand">
            Northfield <span className="site-footer__brand-accent">Journal</span>
          </p>

          <p className="site-footer__description">
            Thoughtful writing for students, educators, and academic thinkers.
            Built on clarity, depth, and ideas that last.
          </p>

          <div className="site-footer__stats">
            {Object.entries(siteConfig.socialProof).map(([label, value]) => (
              <div key={label} className="site-footer__stat">
                <p className="site-footer__stat-value">{value}</p>
                <p className="site-footer__stat-label">
                  {label.replace(/([A-Z])/g, ' $1')}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__links-grid">
          <div>
            <p className="site-footer__heading">Explore</p>
            <div className="site-footer__links">
              {siteConfig.nav.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="site-footer__heading">Publication</p>
            <div className="site-footer__links">
              <Link href="/guest-post">Contribute</Link>
              <Link href="/about">About</Link>
              <Link href="/contact">Contact</Link>
              <Link href="/privacy-policy">Privacy policy</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container-shell site-footer__bottom">
        © {new Date().getFullYear()} {siteConfig.name}. Built for thoughtful readers.
      </div>
    </footer>
  );
}