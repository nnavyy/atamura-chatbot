'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useLanguage } from './LanguageContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { lang, cycleLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: scrolled ? 'rgba(15, 20, 25, 0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
      transition: 'all 0.3s ease',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto', height: 72,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <img
            src="https://static.tildacdn.pro/tild3931-3731-4239-b762-633839313035/Group_12.png"
            alt="Atamura Group"
            style={{ height: 36, objectFit: 'contain', filter: 'brightness(2.5) contrast(1.2)' }}
          />
        </Link>

        {/* Desktop Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}
          className="desktop-nav">
          {[
            { href: '/', label: t('nav.home', lang) },
            { href: '/units', label: t('nav.units', lang) },
            { href: '/analytics', label: t('nav.analytics', lang) },
          ].map((link) => (
            <Link key={link.href} href={link.href} style={{
              color: '#8899a6', textDecoration: 'none', fontSize: 14,
              fontWeight: 500, transition: 'color 0.2s', letterSpacing: '0.3px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#00a3b8')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#8899a6')}>
              {link.label}
            </Link>
          ))}
          <button onClick={cycleLang} style={{
            background: 'rgba(0,116,132,0.15)', border: '1px solid rgba(0,116,132,0.3)',
            color: '#00a3b8', padding: '6px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,116,132,0.3)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0,116,132,0.15)')}>
            {lang.toUpperCase()}
          </button>
          <Link href="tel:+77007001111" style={{
            background: 'linear-gradient(135deg, #007484, #00a3b8)',
            color: 'white', padding: '10px 20px', borderRadius: 10,
            textDecoration: 'none', fontSize: 13, fontWeight: 600,
            transition: 'all 0.3s', boxShadow: '0 4px 15px rgba(0,116,132,0.3)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}>
            +7 700 700 1111
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button onClick={() => setMobileOpen(!mobileOpen)} style={{
          display: 'none', background: 'none', border: 'none',
          color: '#f0f4f8', fontSize: 24, cursor: 'pointer',
        }} className="mobile-menu-btn" id="mobile-menu-btn">
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{
          background: 'rgba(15,20,25,0.95)', backdropFilter: 'blur(20px)',
          padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }} className="mobile-dropdown">
          <Link href="/" style={{ color: '#f0f4f8', textDecoration: 'none', fontSize: 16 }}
            onClick={() => setMobileOpen(false)}>{t('nav.home', lang)}</Link>
          <Link href="/units" style={{ color: '#f0f4f8', textDecoration: 'none', fontSize: 16 }}
            onClick={() => setMobileOpen(false)}>{t('nav.units', lang)}</Link>
          <Link href="/analytics" style={{ color: '#f0f4f8', textDecoration: 'none', fontSize: 16 }}
            onClick={() => setMobileOpen(false)}>{t('nav.analytics', lang)}</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
