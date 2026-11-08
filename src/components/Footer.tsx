'use client';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useLanguage } from './LanguageContext';

export default function Footer() {
  const { lang } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer-top">
          <div>
            <div className="site-footer-title">ATAMURA GROUP</div>
            <p style={{marginTop:18}}>{t('footer.tagline_desc', lang)}</p>
          </div>
          <div>
            <h4>{t('footer.projects', lang)}</h4>
            <div className="site-footer-links">
              <Link href="/units">KERUEN</Link>
              <Link href="/units">{t('nav.units', lang)}</Link>
              <Link href="/analytics">{t('nav.analytics', lang)}</Link>
            </div>
          </div>
          <div>
            <h4>{t('footer.contact', lang)}</h4>
            <div className="site-footer-links">
              <a href="tel:+77007001111">+7 700 700 1111</a>
              <a href="https://www.google.com/maps/search/?api=1&query=Tuzdybastau%2C%20Almaty" target="_blank" rel="noopener noreferrer">Tuzdybastau, Almaty ↗</a>
            </div>
          </div>
        </div>
        <div className="site-footer-bottom">
          <span>{t('footer.rights', lang)}</span>
          <span>KERUEN · Almaty, Kazakhstan</span>
        </div>
      </div>
    </footer>
  );
}
