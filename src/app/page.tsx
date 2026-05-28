'use client';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';
export default function Home() {
  const { lang } = useLanguage();

  const highlights = [
    { icon: '🌿', title: t('highlight.eco', lang), desc: t('highlight.eco_desc', lang) },
    { icon: '🏔️', title: t('highlight.mountain', lang), desc: t('highlight.mountain_desc', lang) },
    { icon: '🛡️', title: t('highlight.seismic', lang), desc: t('highlight.seismic_desc', lang) },
    { icon: '📍', title: t('highlight.location', lang), desc: t('highlight.location_desc', lang) },
  ];

  const units = [
    { type: '1BR', area: '29–46 m²', price: '12 000 000', rooms: 1, icon: '🏠' },
    { type: '2BR', area: '45–51 m²', price: '19 200 000', rooms: 2, icon: '🏡' },
    { type: '3BR', area: '77–79 m²', price: '32 500 000', rooms: 3, icon: '🏘️' },
  ];

  const payments = [
    { method: t('payment.full', lang), desc: t('payment.full_desc', lang), icon: '💎', highlight: t('payment.full_badge', lang) },
    { method: t('payment.installment', lang), desc: t('payment.installment_desc', lang), icon: '📊', highlight: t('payment.installment_badge', lang) },
    { method: t('payment.mortgage', lang), desc: t('payment.mortgage_desc', lang), icon: '🏦', highlight: t('payment.mortgage_badge', lang) },
  ];

  return (
    <>
      {/* Hero */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 30%, #223C50 70%, #1a3a4a 100%)',
      }}>
        {/* Animated background elements */}
        <div style={{
          position: 'absolute', top: '15%', right: '10%', width: 300, height: 300,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,116,132,0.15), transparent)',
          filter: 'blur(60px)', animation: 'float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', left: '5%', width: 200, height: 200,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(201,169,110,0.1), transparent)',
          filter: 'blur(40px)', animation: 'float 6s ease-in-out infinite 2s',
        }} />

        <div style={{ textAlign: 'center', maxWidth: 800, padding: '0 24px', position: 'relative', zIndex: 1 }}>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 800, marginBottom: 24, lineHeight: 1.1 }}>
            <span style={{ color: '#f0f4f8' }}>{t('hero.title_1', lang)} </span>
            <span className="gradient-text">{t('hero.title_2', lang)}</span>
            <br />
            <span style={{ color: '#f0f4f8' }}>{t('hero.title_3', lang)}</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: '#8899a6', maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7 }}>
            {t('hero.subtitle', lang)}
          </p>

          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/units" className="btn-primary" style={{
              padding: '16px 36px', fontSize: 16, borderRadius: 14, textDecoration: 'none',
            }} id="hero-explore-btn">
              {t('hero.cta', lang)}
            </Link>
            <Link href="tel:+77007001111" className="btn-secondary" style={{
              padding: '16px 36px', fontSize: 16, borderRadius: 14, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              📞 +7 700 700 1111
            </Link>
          </div>

          {/* Stats */}
          <div style={{
            display: 'flex', gap: 48, justifyContent: 'center', marginTop: 64,
            flexWrap: 'wrap',
          }}>
            {[
              { num: '8+', label: t('stats.projects', lang) },
              { num: '15+', label: t('stats.years', lang) },
              { num: '3', label: t('stats.unit_types', lang) },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: '#00a3b8' }}>{s.num}</div>
                <div style={{ fontSize: 13, color: '#536471', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="section" style={{ background: '#0f1419' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0f4f8', marginBottom: 16 }}>
              {t('section.why_title_1', lang)} <span className="gradient-text">{t('section.why_title_2', lang)}</span>
            </h2>
            <p style={{ color: '#8899a6', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              {t('section.why_desc', lang)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {highlights.map((h, i) => (
              <div key={i} className="card" style={{
                padding: '32px 28px', textAlign: 'center',
                animationDelay: `${i * 0.1}s`,
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{h.icon}</div>
                <h3 style={{ fontSize: 18, color: '#f0f4f8', marginBottom: 8 }}>{h.title}</h3>
                <p style={{ fontSize: 14, color: '#8899a6', lineHeight: 1.6 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Unit Teaser */}
      <section className="section" style={{
        background: 'linear-gradient(180deg, #0f1419, #1a2332)',
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0f4f8', marginBottom: 16 }}>
              {t('section.layout_title_1', lang)} <span className="gradient-text">{t('section.layout_title_2', lang)}</span>
            </h2>
            <p style={{ color: '#8899a6', fontSize: 16 }}>
              {t('section.layout_desc', lang)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {units.map((u, i) => (
              <div key={i} className="card" style={{ padding: '36px 28px' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>{u.icon}</div>
                <h3 style={{ fontSize: 28, fontWeight: 800, color: '#f0f4f8', marginBottom: 8 }}>
                  {u.type}
                </h3>
                <div style={{ fontSize: 14, color: '#8899a6', marginBottom: 16 }}>
                  <span>{u.rooms} {t('units.rooms', lang)}</span>
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>{u.area}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#00a3b8', marginBottom: 20 }}>
                  {t('units.from', lang)} {u.price} ₸
                </div>
                <Link href="/units" style={{
                  display: 'inline-block', padding: '10px 24px',
                  background: 'rgba(0,116,132,0.15)', border: '1px solid rgba(0,116,132,0.3)',
                  borderRadius: 10, color: '#00a3b8', textDecoration: 'none',
                  fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {t('units.view_details', lang)} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Buy */}
      <section className="section" style={{ background: '#0f1419' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0f4f8', marginBottom: 16 }}>
              {t('section.payment_title_1', lang)} <span className="gradient-text">{t('section.payment_title_2', lang)}</span>
            </h2>
            <p style={{ color: '#8899a6', fontSize: 16 }}>
              {t('section.payment_desc', lang)}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {payments.map((p, i) => (
              <div key={i} className="card" style={{ padding: '36px 28px', position: 'relative', overflow: 'visible' }}>
                <div style={{
                  position: 'absolute', top: -12, right: 20,
                  background: 'linear-gradient(135deg, #C9A96E, #e0c88f)',
                  color: '#1a2332', padding: '4px 14px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.5px',
                }}>{p.highlight}</div>
                <div style={{ fontSize: 40, marginBottom: 16 }}>{p.icon}</div>
                <h3 style={{ fontSize: 20, color: '#f0f4f8', marginBottom: 8 }}>{p.method}</h3>
                <p style={{ fontSize: 14, color: '#8899a6', lineHeight: 1.7 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location CTA */}
      <section className="section" style={{
        background: 'linear-gradient(135deg, #1a2332, #223C50)',
      }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0f4f8', marginBottom: 16 }}>
            {t('section.location_title_1', lang)} <span className="gradient-text">{t('section.location_title_2', lang)}</span>
          </h2>
          <p style={{ color: '#8899a6', fontSize: 16, maxWidth: 600, margin: '0 auto 32px' }}>
            {t('section.location_desc', lang)}
          </p>
          <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.3)', maxWidth: 800, margin: '0 auto' }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2906.7!2d76.95!3d43.35!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDPCsDIxJzAwLjAiTiA3NsKwNTcnMDAuMCJF!5e0!3m2!1sen!2skz!4v1"
              width="100%" height="350" style={{ border: 0 }} loading="lazy"
              title="KERUEN Location"
            />
          </div>
        </div>
      </section>
    </>
  );
}
