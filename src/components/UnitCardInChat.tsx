'use client';
import { Language, t } from '@/lib/i18n';

interface Unit {
  id: string; code: string; type: string; rooms: number;
  areaSqm: number; priceMin: number; status: string;
  view?: string; floor?: string; floorPlan?: string;
}

export default function UnitCardInChat({ unit, lang }: { unit: Unit; lang: Language }) {
  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: 'rgba(0,200,83,0.15)', text: '#00c853' },
    reserved: { bg: 'rgba(255,152,0,0.15)', text: '#ff9800' },
    sold: { bg: 'rgba(239,83,80,0.15)', text: '#ef5350' },
  };
  const sc = statusColors[unit.status] || statusColors.available;

  return (
    <div style={{
      background: '#1a2332', border: '1px solid rgba(0,116,132,0.3)',
      borderRadius: 14, padding: '14px 16px', width: '100%',
      transition: 'all 0.2s', cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#007484';
      e.currentTarget.style.background = '#1e2a3a';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'rgba(0,116,132,0.3)';
      e.currentTarget.style.background = '#1a2332';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🏠</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#f0f4f8' }}>
            Unit {unit.code}
          </span>
        </div>
        <span style={{
          background: sc.bg, color: sc.text,
          padding: '3px 10px', borderRadius: 12,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {t(`units.${unit.status}` as 'units.available', lang)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#8899a6', marginBottom: 6 }}>
        <span>{unit.areaSqm} m²</span>
        <span>•</span>
        <span>{unit.rooms} {t('units.rooms', lang)}</span>
        {unit.view && <><span>•</span><span>{unit.view}</span></>}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#00a3b8', marginBottom: unit.floorPlan ? 12 : 0 }}>
        {t('units.from', lang)} {unit.priceMin.toLocaleString('ru-RU')} ₸
      </div>
      {unit.floorPlan && (
        <div style={{
          width: '100%', height: 120, borderRadius: 8, overflow: 'hidden',
          background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={unit.floorPlan} 
            alt={`Layout ${unit.code}`} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
          />
        </div>
      )}
    </div>
  );
}
