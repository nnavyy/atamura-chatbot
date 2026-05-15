'use client';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { formatTenge, getAllPaymentOptions } from '@/lib/calculator';

interface Unit {
  id: string; code: string; type: string; rooms: number;
  areaSqm: number; priceMin: number; status: string;
  view?: string; floor?: string; features?: string; floorPlan?: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [filter, setFilter] = useState('All');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [payTab, setPayTab] = useState<'full' | 'installment' | 'mortgage'>('installment');
  const { lang } = useLanguage();

  useEffect(() => {
    fetch('/api/units').then((r) => r.json()).then(setUnits).catch(console.error);
  }, []);

  const filtered = filter === 'All' ? units : units.filter((u) => u.type === filter);
  const tabs = ['All', '1BR', '2BR', '3BR'];

  const statusStyle: Record<string, { bg: string; text: string; label: string }> = {
    available: { bg: 'rgba(0,200,83,0.15)', text: '#00c853', label: t('units.available', lang) },
    reserved: { bg: 'rgba(255,152,0,0.15)', text: '#ff9800', label: t('units.reserved', lang) },
    sold: { bg: 'rgba(239,83,80,0.15)', text: '#ef5350', label: t('units.sold', lang) },
  };

  return (
    <div style={{ paddingTop: 72 }}>
      {/* Header */}
      <section style={{
        background: 'linear-gradient(135deg, #1a2332, #223C50)',
        padding: '64px 24px 48px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', color: '#f0f4f8', marginBottom: 16 }}>
          {t('units.title_1', lang)} <span className="gradient-text">{t('units.title_2', lang)}</span>
        </h1>
        <p style={{ color: '#8899a6', fontSize: 16, maxWidth: 500, margin: '0 auto 32px' }}>
          {t('units.desc', lang)}
        </p>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setFilter(tab)} style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s', border: 'none',
              background: filter === tab ? 'linear-gradient(135deg, #007484, #00a3b8)' : 'rgba(255,255,255,0.06)',
              color: filter === tab ? 'white' : '#8899a6',
              boxShadow: filter === tab ? '0 4px 15px rgba(0,116,132,0.3)' : 'none',
            }} id={`filter-${tab.toLowerCase()}`}>
              {tab === 'All' ? t('units.all', lang) : tab}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section style={{ padding: '48px 24px', background: '#0f1419' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {filtered.map((unit) => {
            const ss = statusStyle[unit.status] || statusStyle.available;
            const features = unit.features ? JSON.parse(unit.features) : [];
            return (
              <div key={unit.id} className="card" style={{
                padding: '28px', cursor: 'pointer',
                opacity: unit.status === 'sold' ? 0.6 : 1,
              }} onClick={() => unit.status !== 'sold' && setSelectedUnit(unit)}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, color: '#f0f4f8' }}>Unit {unit.code}</h3>
                    <span style={{ fontSize: 13, color: '#8899a6' }}>{unit.type}</span>
                  </div>
                  <span style={{
                    background: ss.bg, color: ss.text,
                    padding: '5px 12px', borderRadius: 12,
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  }}>{ss.label}</span>
                </div>
                {/* Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#536471', marginBottom: 4 }}>{t('units.area_title', lang)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8' }}>{unit.areaSqm} m²</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: '#536471', marginBottom: 4 }}>{t('units.rooms_title', lang)}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#f0f4f8' }}>{unit.rooms}</div>
                  </div>
                  {unit.view && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: '#536471', marginBottom: 4 }}>{t('units.view', lang)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{unit.view}</div>
                    </div>
                  )}
                  {unit.floor && (
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: 10 }}>
                      <div style={{ fontSize: 11, color: '#536471', marginBottom: 4 }}>{t('units.floors', lang)}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{unit.floor}</div>
                    </div>
                  )}
                </div>
                {/* Features */}
                {features.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {features.slice(0, 3).map((f: string, i: number) => (
                      <span key={i} style={{
                        background: 'rgba(0,116,132,0.1)', color: '#00a3b8',
                        padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                      }}>{f}</span>
                    ))}
                  </div>
                )}
                {/* Price */}
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#536471' }}>{t('units.starting_from', lang)}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#00a3b8' }}>
                      {formatTenge(unit.priceMin)}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#536471' }}>
                    {Math.round(unit.priceMin / unit.areaSqm).toLocaleString('ru-RU')} ₸/m²
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detail Modal */}
      {selectedUnit && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.3s ease-out',
        }} onClick={() => setSelectedUnit(null)}>
          <div style={{
            background: '#1a2332', borderRadius: 20, maxWidth: 520, width: '100%',
            maxHeight: '85vh', overflowY: 'auto', padding: '32px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 800, color: '#f0f4f8' }}>Unit {selectedUnit.code}</h2>
                <span style={{ color: '#8899a6' }}>{selectedUnit.type} · {selectedUnit.areaSqm} m² · {selectedUnit.rooms} rooms</span>
              </div>
              <button onClick={() => setSelectedUnit(null)} style={{
                background: 'none', border: 'none', color: '#8899a6',
                fontSize: 24, cursor: 'pointer',
              }}>×</button>
            </div>

            {/* Layout Image */}
            {selectedUnit.floorPlan && (
              <div style={{
                width: '100%', height: 280, borderRadius: 14, overflow: 'hidden',
                background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={selectedUnit.floorPlan} 
                  alt={`Layout ${selectedUnit.code}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              </div>
            )}

            {/* Payment tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {(['full', 'installment', 'mortgage'] as const).map((m) => (
                <button key={m} onClick={() => setPayTab(m)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: payTab === m ? 'linear-gradient(135deg, #007484, #00a3b8)' : 'rgba(255,255,255,0.06)',
                  color: payTab === m ? 'white' : '#8899a6',
                }}>
                  {m === 'full' ? '💎 Full' : m === 'installment' ? '📊 Installment' : '🏦 Mortgage'}
                </button>
              ))}
            </div>

            {/* Calculation */}
            {(() => {
              const opts = getAllPaymentOptions(selectedUnit.priceMin, selectedUnit.code);
              const calc = opts[payTab];
              return (
                <div style={{
                  background: 'rgba(0,116,132,0.08)', border: '1px solid rgba(0,116,132,0.2)',
                  borderRadius: 14, padding: '20px', marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8899a6', fontSize: 14 }}>Down Payment ({calc.dpPercent}%)</span>
                      <span style={{ color: '#f0f4f8', fontWeight: 700 }}>{formatTenge(calc.dp)}</span>
                    </div>
                    {calc.monthly > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8899a6', fontSize: 14 }}>Monthly Payment</span>
                        <span style={{ color: '#00a3b8', fontWeight: 700 }}>{formatTenge(calc.monthly)}</span>
                      </div>
                    )}
                    {calc.tenor > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8899a6', fontSize: 14 }}>Tenor</span>
                        <span style={{ color: '#f0f4f8' }}>{calc.tenor} months</span>
                      </div>
                    )}
                    {calc.interestRate > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#8899a6', fontSize: 14 }}>Interest Rate</span>
                        <span style={{ color: '#f0f4f8' }}>{calc.interestRate}% p.a.</span>
                      </div>
                    )}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#8899a6', fontWeight: 600 }}>Total</span>
                      <span style={{ color: '#C9A96E', fontWeight: 800, fontSize: 18 }}>{formatTenge(calc.total)}</span>
                    </div>
                    {calc.savings !== 0 && (
                      <div style={{ fontSize: 12, color: calc.savings > 0 ? '#00c853' : '#ef5350', textAlign: 'right' }}>
                        {calc.savings > 0 ? `You save ${formatTenge(calc.savings)}` : `Overpayment: ${formatTenge(Math.abs(calc.savings))}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            <a href="tel:+77007001111" className="btn-primary" style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              padding: '14px', borderRadius: 12, fontSize: 15,
            }}>
              📞 Contact Sales: +7 700 700 1111
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
