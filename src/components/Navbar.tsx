'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t } from '@/lib/i18n';
import { useLanguage } from './LanguageContext';

export default function Navbar() {
  const { lang, cycleLang } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { href: '/', label: t('nav.home', lang) },
    { href: '/units', label: t('nav.units', lang) },
    { href: '/analytics', label: t('nav.analytics', lang) },
  ];
  return (
    <header className="site-nav">
      <nav aria-label="Main navigation" className="site-nav-inner">
        <Link href="/" className="site-brand" onClick={() => setMobileOpen(false)}>
          <span className="site-brand-mark" aria-hidden="true" />
          ATAMURA GROUP
        </Link>
        <div className="site-nav-links">
          {links.map((link) => (
            <Link key={link.href} className="site-nav-link" href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
          <button onClick={cycleLang} className="site-lang" title="Change language" aria-label="Change language">
            {lang.toUpperCase()} <span aria-hidden="true">⌄</span>
          </button>
          <a className="site-nav-cta" href="tel:+77007001111">{t('nav.contact', lang)} <span aria-hidden="true">↗</span></a>
        </div>
        <button className="site-menu-toggle" type="button" aria-expanded={mobileOpen} aria-controls="mobile-navigation" onClick={() => setMobileOpen((open) => !open)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'}>
          {mobileOpen ? '×' : '☰'}
        </button>
      </nav>
      {mobileOpen && (
        <div id="mobile-navigation" className="site-mobile-links">
          {links.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setMobileOpen(false)}>{link.label}</Link>
          ))}
          <button onClick={cycleLang} className="site-lang" style={{ alignSelf:'flex-start' }}>{lang.toUpperCase()} · Change language</button>
          <a href="tel:+77007001111" onClick={() => setMobileOpen(false)}>{t('nav.contact', lang)}</a>
        </div>
      )}
    </header>
  );
}
