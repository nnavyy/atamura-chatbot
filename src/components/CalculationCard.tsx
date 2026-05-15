'use client';
import { Language, t } from '@/lib/i18n';

interface Calculation {
  unitCode: string; method: string; dp: number;
  monthly: number; total: number; tenor: number;
}

export default function CalculationCard({ calc, lang }: { calc: Calculation; lang: Language }) {
  const methodLabels: Record<string, string> = {
    full: t('payment.full', lang),
    installment: t('payment.installment', lang),
    mortgage: t('payment.mortgage', lang),
  };

  const fmt = (n?: number) => n ? n.toLocaleString('ru-RU') + ' ₸' : '0 ₸';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,116,132,0.15), rgba(0,163,184,0.05))',
      border: '1px solid rgba(0,116,132,0.3)',
      borderRadius: 14, padding: '16px', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>💰</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#f0f4f8' }}>
          Unit {calc.unitCode} — {methodLabels[calc.method] || calc.method}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
          <span style={{ color: '#8899a6' }}>{t('payment.dp', lang)}</span>
          <span style={{ color: '#f0f4f8', fontWeight: 600 }}>{fmt(calc.dp)}</span>
        </div>
        {calc.monthly > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#8899a6' }}>{t('payment.monthly', lang)}</span>
            <span style={{ color: '#00a3b8', fontWeight: 600 }}>{fmt(calc.monthly)}</span>
          </div>
        )}
        {calc.tenor > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#8899a6' }}>Tenor</span>
            <span style={{ color: '#f0f4f8' }}>{calc.tenor} months</span>
          </div>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 4,
          display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
          <span style={{ color: '#8899a6', fontWeight: 600 }}>{t('payment.total', lang)}</span>
          <span style={{ color: '#C9A96E', fontWeight: 700 }}>{fmt(calc.total)}</span>
        </div>
      </div>
    </div>
  );
}
