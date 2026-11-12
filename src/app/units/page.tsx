'use client';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { formatTenge, getAllPaymentOptions } from '@/lib/calculator';

interface Unit {
  id: string;
  code: string;
  type: string;
  rooms: number;
  areaSqm: number;
  priceMin: number;
  status: string;
  view?: string;
  floor?: string;
  features?: string;
  floorPlan?: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [payTab, setPayTab] = useState<'full' | 'installment' | 'mortgage'>('installment');
  const { lang } = useLanguage();

  useEffect(() => {
    fetch('/api/units')
      .then((r) => r.json())
      .then(setUnits)
      .catch(console.error);
  }, []);

  const filtered = filter === 'All' ? units : units.filter((u) => u.type === filter);
  const tabs = ['All', '1BR', '2BR', '3BR'];

  const statusStyle: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
    available: {
      bg: 'rgba(0, 200, 83, 0.12)',
      border: 'rgba(0, 200, 83, 0.3)',
      text: '#00c853',
      dot: '#00c853',
      label: t('units.available', lang),
    },
    reserved: {
      bg: 'rgba(255, 152, 0, 0.12)',
      border: 'rgba(255, 152, 0, 0.3)',
      text: '#ff9800',
      dot: '#ff9800',
      label: t('units.reserved', lang),
    },
    sold: {
      bg: 'rgba(239, 83, 80, 0.12)',
      border: 'rgba(239, 83, 80, 0.3)',
      text: '#ef5350',
      dot: '#ef5350',
      label: t('units.sold', lang),
    },
  };

  return (
    <div style={{ paddingTop: 72, background: '#0b1016', minHeight: '100vh', color: '#f0f4f8' }}>
      {/* Hero Header */}
      <section style={{
        background: 'linear-gradient(180deg, #162432 0%, #0e1722 100%)',
        padding: '64px 24px 40px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px', borderRadius: 20,
            background: 'rgba(0, 116, 132, 0.15)', border: '1px solid rgba(0, 116, 132, 0.3)',
            color: '#00a3b8', fontSize: 13, fontWeight: 600, marginBottom: 16,
          }}>
            🏢 Kompleks Perumahan KERUEN · Tuzdybastau, Almaty
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            {t('units.title_1', lang)} <span className="gradient-text">{t('units.title_2', lang)}</span>
          </h1>
          <p style={{ color: '#8899a6', fontSize: 16, maxWidth: 620, margin: '0 auto 32px', lineHeight: 1.6 }}>
            {t('units.desc', lang)}
          </p>

          {/* Filter tabs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {tabs.map((tab) => {
              const active = filter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    border: active ? '1px solid #00a3b8' : '1px solid rgba(255,255,255,0.08)',
                    background: active
                      ? 'linear-gradient(135deg, #007484, #00a3b8)'
                      : 'rgba(255,255,255,0.04)',
                    color: active ? '#ffffff' : '#8899a6',
                    boxShadow: active ? '0 4px 16px rgba(0, 116, 132, 0.35)' : 'none',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                  }}
                  id={`filter-${tab.toLowerCase()}`}
                >
                  {tab === 'All' ? t('units.all', lang) : tab}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid Katalog Apartemen */}
      <section style={{ padding: '48px 24px 80px', maxWidth: 1240, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: 28,
        }}>
          {filtered.map((unit) => {
            const ss = statusStyle[unit.status] || statusStyle.available;
            const features = unit.features ? JSON.parse(unit.features) : [];
            const isSold = unit.status === 'sold';

            return (
              <div
                key={unit.id}
                onClick={() => !isSold && setSelectedUnit(unit)}
                style={{
                  background: '#131b26',
                  borderRadius: 20,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: isSold ? 'not-allowed' : 'pointer',
                  opacity: isSold ? 0.65 : 1,
                  transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                }}
                onMouseEnter={(e) => {
                  if (!isSold) {
                    e.currentTarget.style.transform = 'translateY(-6px)';
                    e.currentTarget.style.borderColor = 'rgba(0, 163, 184, 0.5)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(0, 116, 132, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSold) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.25)';
                  }
                }}
              >
                {/* 1. Floor Plan Preview Area (Dedicated Container - Clean White Background) */}
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 220,
                  background: '#ffffff',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}>
                  {/* Unit Type Badge */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    left: 12,
                    background: '#1a2332',
                    color: '#00a3b8',
                    border: '1px solid rgba(0, 116, 132, 0.3)',
                    padding: '4px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                  }}>
                    {unit.type}
                  </div>

                  {/* Status Badge with Dot */}
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: ss.bg,
                    border: `1px solid ${ss.border}`,
                    color: ss.text,
                    padding: '4px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: ss.dot,
                      boxShadow: `0 0 6px ${ss.dot}`,
                    }} />
                    {ss.label}
                  </div>

                  {/* Floor Plan Drawing */}
                  {unit.floorPlan ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={unit.floorPlan}
                      alt={`Denah Unit ${unit.code}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.05))',
                      }}
                    />
                  ) : (
                    <div style={{ color: '#8899a6', fontSize: 13 }}>Denah Arsitektur</div>
                  )}
                </div>

                {/* 2. Unit Content & Specifications */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Title & Specs */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4f8' }}>
                      Unit {unit.code}
                    </h3>
                    <span style={{ fontSize: 13, color: '#8899a6', fontWeight: 500 }}>
                      Lantai {unit.floor || '2-5'}
                    </span>
                  </div>

                  {/* Specs Pills */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    color: '#8899a6',
                    fontSize: 13,
                    marginBottom: 16,
                  }}>
                    <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
                      📏 {unit.areaSqm} m²
                    </span>
                    <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
                      🛏️ {unit.rooms} {t('units.rooms', lang)}
                    </span>
                    {unit.view && (
                      <span style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 8px', borderRadius: 6 }}>
                        🌄 {unit.view}
                      </span>
                    )}
                  </div>

                  {/* Key Features */}
                  {features.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                      {features.slice(0, 3).map((feat: string, idx: number) => (
                        <span
                          key={idx}
                          style={{
                            background: 'rgba(0, 116, 132, 0.1)',
                            border: '1px solid rgba(0, 116, 132, 0.2)',
                            color: '#00a3b8',
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 6,
                            fontWeight: 500,
                          }}
                        >
                          {feat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pricing Footer */}
                  <div style={{
                    marginTop: 'auto',
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    paddingTop: 16,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#536471', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
                        {t('units.starting_from', lang)}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#00a3b8' }}>
                        {formatTenge(unit.priceMin)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#8899a6', fontWeight: 600 }}>
                        {Math.round(unit.priceMin / unit.areaSqm).toLocaleString('ru-RU')} ₸/m²
                      </div>
                      <div style={{ fontSize: 11, color: '#00c853', fontWeight: 600, marginTop: 2 }}>
                        {isSold ? 'Habis Terjual' : 'Simulasi Finansial ↗'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Detail & Financial Calculator (Spacious 2-Column Responsive Layout) */}
      {selectedUnit && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(5, 10, 15, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            animation: 'fadeIn 0.25s ease-out',
          }}
          onClick={() => setSelectedUnit(null)}
        >
          <div
            style={{
              background: '#162230',
              borderRadius: 24,
              maxWidth: 960,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              border: '1px solid rgba(0, 116, 132, 0.3)',
              boxShadow: '0 32px 100px rgba(0,0,0,0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f0f4f8' }}>
                    Unit {selectedUnit.code}
                  </h2>
                  <span style={{
                    background: 'rgba(0, 116, 132, 0.2)',
                    border: '1px solid rgba(0, 116, 132, 0.4)',
                    color: '#00a3b8',
                    padding: '4px 12px',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    {selectedUnit.type}
                  </span>
                </div>
                <p style={{ color: '#8899a6', fontSize: 14 }}>
                  {selectedUnit.areaSqm} m² · {selectedUnit.rooms} Kamar Tidur · Lantai {selectedUnit.floor || '2-5'} · Pemandangan {selectedUnit.view || 'Courtyard'}
                </p>
              </div>

              <button
                onClick={() => setSelectedUnit(null)}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  color: '#8899a6',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  e.currentTarget.style.color = '#8899a6';
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body: 2 Columns (Left: Floor Plan | Right: Financial Calculator) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: 28,
            }}>
              {/* Left Column: Floor Plan & Specifications */}
              <div>
                <div style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  height: 320,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                  marginBottom: 16,
                }}>
                  {selectedUnit.floorPlan ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selectedUnit.floorPlan}
                      alt={`Denah ${selectedUnit.code}`}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  ) : (
                    <div style={{ color: '#8899a6' }}>Denah arsitektur belum diunggah</div>
                  )}
                </div>

                {/* Quick Specs Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 10,
                  background: 'rgba(255,255,255,0.03)',
                  padding: 16,
                  borderRadius: 14,
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#536471' }}>Tinggi Plafon</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>2,7 Meter</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#536471' }}>Ketahanan Gempa</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#00c853' }}>9 Skala Richter</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#536471' }}>Sistem Pemanas</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f4f8' }}>Gas Sentral Otonom</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#536471' }}>Harga / m²</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#00a3b8' }}>
                      {Math.round(selectedUnit.priceMin / selectedUnit.areaSqm).toLocaleString('ru-RU')} ₸
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Financial Calculator (Completely Separate Container) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8', marginBottom: 14 }}>
                  Simulasi Skema Pembayaran
                </h3>

                {/* Payment Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {(['full', 'installment', 'mortgage'] as const).map((m) => {
                    const active = payTab === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setPayTab(m)}
                        style={{
                          flex: 1,
                          padding: '10px 8px',
                          borderRadius: 10,
                          border: active ? '1px solid #00a3b8' : '1px solid rgba(255,255,255,0.08)',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: active
                            ? 'linear-gradient(135deg, #007484, #00a3b8)'
                            : 'rgba(255,255,255,0.04)',
                          color: active ? '#ffffff' : '#8899a6',
                          transition: 'all 0.2s',
                        }}
                      >
                        {m === 'full' ? '💎 Tunai (-3%)' : m === 'installment' ? '📊 Cicilan (0%)' : '🏦 KPR (17%)'}
                      </button>
                    );
                  })}
                </div>

                {/* Calculation Box */}
                {(() => {
                  const opts = getAllPaymentOptions(selectedUnit.priceMin, selectedUnit.code);
                  const calc = opts[payTab];
                  return (
                    <div style={{
                      background: 'rgba(0, 116, 132, 0.08)',
                      border: '1px solid rgba(0, 116, 132, 0.25)',
                      borderRadius: 16,
                      padding: '20px',
                      marginBottom: 16,
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: '#8899a6' }}>Uang Muka / DP ({calc.dpPercent}%)</span>
                          <span style={{ color: '#f0f4f8', fontWeight: 700 }}>{formatTenge(calc.dp)}</span>
                        </div>
                        {calc.monthly > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <span style={{ color: '#8899a6' }}>Angsuran Bulanan</span>
                            <span style={{ color: '#00c853', fontWeight: 800, fontSize: 16 }}>
                              {formatTenge(calc.monthly)} / bln
                            </span>
                          </div>
                        )}
                        {calc.tenor > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                            <span style={{ color: '#8899a6' }}>Jangka Waktu (Tenor)</span>
                            <span style={{ color: '#f0f4f8', fontWeight: 600 }}>{calc.tenor} bulan</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                          <span style={{ color: '#8899a6' }}>Suku Bunga</span>
                          <span style={{ color: calc.interestRate === 0 ? '#00c853' : '#f0f4f8', fontWeight: 600 }}>
                            {calc.interestRate > 0 ? `${calc.interestRate}% p.a. (Efektif)` : '0% (Tanpa Bunga)'}
                          </span>
                        </div>
                        <div style={{
                          borderTop: '1px solid rgba(255,255,255,0.08)',
                          paddingTop: 12,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}>
                          <span style={{ color: '#8899a6', fontWeight: 600 }}>Total Estimasi</span>
                          <span style={{ color: '#C9A96E', fontWeight: 800, fontSize: 19 }}>
                            {formatTenge(calc.total)}
                          </span>
                        </div>
                        {calc.savings !== 0 && (
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: calc.savings > 0 ? '#00c853' : '#ff9800',
                            textAlign: 'right',
                          }}>
                            {calc.savings > 0
                              ? `✓ Hemat ${formatTenge(calc.savings)} dengan pembayaran tunai`
                              : `Selisih bunga: ${formatTenge(Math.abs(calc.savings))}`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Legal / Banking Disclaimer */}
                <p style={{
                  fontSize: 11,
                  color: '#64748b',
                  lineHeight: 1.5,
                  marginBottom: 20,
                  fontStyle: 'italic',
                }}>
                  *Estimasi ilustratif. Ketentuan final cicilan disesuaikan dengan verifikasi dokumen oleh divisi penjualan Atamura Group dan bank mitra (Otbasy Bank / Freedom Finance).
                </p>

                {/* Dual Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
                  <a
                    href="tel:+77007001111"
                    className="btn-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      textAlign: 'center',
                      textDecoration: 'none',
                      padding: '13px',
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                  >
                    📞 Hubungi Sales: +7 700 700 1111
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
