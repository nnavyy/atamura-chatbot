'use client';
import { useState } from 'react';
import { Language, t } from '@/lib/i18n';

interface Unit {
  id: string; code: string; type: string; rooms: number;
  areaSqm: number; priceMin: number; status: string;
  view?: string; floor?: string; floorPlan?: string;
}

export default function UnitCardInChat({ unit, lang }: { unit: Unit; lang: Language }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusColors: Record<string, { bg: string; text: string }> = {
    available: { bg: 'rgba(0,200,83,0.15)', text: '#00c853' },
    reserved: { bg: 'rgba(255,152,0,0.15)', text: '#ff9800' },
    sold: { bg: 'rgba(239,83,80,0.15)', text: '#ef5350' },
  };
  const sc = statusColors[unit.status] || statusColors.available;

  return (
    <>
      <div 
        onClick={() => {
          if (unit.floorPlan) {
            setIsModalOpen(true);
          }
        }}
        style={{
          background: '#1a2332', border: '1px solid rgba(0,116,132,0.3)',
          borderRadius: 14, padding: '14px 16px', width: '100%',
          transition: 'all 0.2s', cursor: unit.floorPlan ? 'pointer' : 'default',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007484';
          e.currentTarget.style.background = '#1e2a3a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,116,132,0.3)';
          e.currentTarget.style.background = '#1a2332';
        }}
      >
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

      {isModalOpen && unit.floorPlan && (
        <div 
          onClick={() => setIsModalOpen(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'pointer', backdropFilter: 'blur(5px)',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a2332', borderRadius: 20, overflow: 'hidden',
              maxWidth: 600, width: '100%', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)', cursor: 'default',
              position: 'relative', border: '1px solid rgba(0,116,132,0.3)',
              animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: 'none', borderRadius: '50%',
                width: 36, height: 36, fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', zIndex: 10, transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              ×
            </button>
            
            <div style={{ padding: '24px', background: '#1e2a3a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>🏠</span>
                <h3 style={{ margin: 0, fontSize: 22, color: '#f0f4f8' }}>Unit {unit.code}</h3>
                <span style={{
                  background: sc.bg, color: sc.text,
                  padding: '4px 12px', borderRadius: 12,
                  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  marginLeft: 'auto', marginRight: 40
                }}>
                  {t(`units.${unit.status}` as 'units.available', lang)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 15, color: '#8899a6' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Area</span>
                  <span style={{ color: '#f0f4f8', fontWeight: 500 }}>{unit.areaSqm} m²</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rooms</span>
                  <span style={{ color: '#f0f4f8', fontWeight: 500 }}>{unit.rooms} {t('units.rooms', lang)}</span>
                </div>
                {unit.view && (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>View</span>
                    <span style={{ color: '#f0f4f8', fontWeight: 500 }}>{unit.view}</span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00a3b8', marginTop: 16 }}>
                {t('units.from', lang)} {unit.priceMin.toLocaleString('ru-RU')} ₸
              </div>
            </div>

            <div style={{ 
              flex: 1, overflow: 'auto', display: 'flex', 
              alignItems: 'center', justifyContent: 'center',
              background: '#f8f9fa', padding: '32px 24px',
              minHeight: 300
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={unit.floorPlan} 
                alt={`Layout ${unit.code}`} 
                style={{ width: '100%', maxHeight: '50vh', objectFit: 'contain' }} 
              />
            </div>
            
            <div style={{ padding: '16px 24px', background: '#1a2332', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'linear-gradient(135deg, #007484, #00a3b8)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '10px 24px', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(0,116,132,0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
