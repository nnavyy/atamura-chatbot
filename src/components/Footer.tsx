'use client';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';

export default function Footer() {
  const { lang } = useLanguage();
  return (
    <footer style={{
      background: '#0a0f14', borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '48px 24px 24px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 40, marginBottom: 40 }}>
          {/* Brand */}
          <div>
            <img
              src="https://static.tildacdn.pro/tild3931-3731-4239-b762-633839313035/Group_12.png"
              alt="Atamura Group" style={{ height: 32, marginBottom: 16, filter: 'brightness(2.5) contrast(1.2)' }}
            />
            <p style={{ color: '#8899a6', fontSize: 14, lineHeight: 1.6, maxWidth: 280 }}>
              {t('footer.tagline_desc', lang)}
            </p>
          </div>

          {/* Projects */}
          <div>
            <h4 style={{ color: '#f0f4f8', fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {t('footer.projects', lang)}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {['KERUEN', 'Атмосфера', 'AQSAI Resort', 'AURA', 'ARLAN', 'MONARCH'].map((p) => (
                <span key={p} style={{ color: '#536471', fontSize: 14, cursor: 'default' }}>{p}</span>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 style={{ color: '#f0f4f8', fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '1px', textTransform: 'uppercase' }}>
              {t('footer.contact', lang)}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="tel:+77007001111" style={{ color: '#00a3b8', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                +7 (700) 700 11 11
              </Link>
              <Link href="https://www.instagram.com/atamura.group" target="_blank" style={{ color: '#8899a6', textDecoration: 'none', fontSize: 14 }}>
                Instagram: @atamura.group
              </Link>
              <Link href="https://atamuragroup.kz" target="_blank" style={{ color: '#8899a6', textDecoration: 'none', fontSize: 14 }}>
                atamuragroup.kz
              </Link>
              <span style={{ color: '#536471', fontSize: 13 }}>
                Tuzdybastau, Talgarsky District, Almaty Region
              </span>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ color: '#536471', fontSize: 12 }}>
            {t('footer.rights', lang)}
          </span>
          <span style={{ color: '#536471', fontSize: 12 }}>
            AI Property Consultant — Built with Next.js & Gemini
          </span>
        </div>
      </div>
    </footer>
  );
}
