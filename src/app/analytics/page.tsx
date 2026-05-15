'use client';
import { useState, useEffect } from 'react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';

interface Analytics {
  totalChats: number;
  totalLeads: number;
  hotLeads: number;
  conversionRate: number;
  intentCounts: Record<string, number>;
  unitCounts: Record<string, number>;
  languageDistribution: Record<string, number>;
}

interface Lead {
  id: string; sessionId: string; name?: string; whatsapp?: string;
  budget?: number; purpose?: string; interest?: string;
  status: string; score: number; language: string;
  createdAt: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const { lang } = useLanguage();

  useEffect(() => {
    Promise.all([
      fetch('/api/analytics').then((r) => r.json()),
      fetch('/api/leads').then((r) => r.json()),
    ]).then(([analytics, leadsData]) => {
      setData(analytics);
      setLeads(Array.isArray(leadsData) ? leadsData : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n?.toLocaleString('ru-RU') || '0';
  const tierColor = (score: number) => score >= 75 ? '#00c853' : score >= 40 ? '#ff9800' : '#536471';
  const tierLabel = (score: number) => score >= 75 ? t('analytics.tier.high', lang) : score >= 40 ? t('analytics.tier.medium', lang) : t('analytics.tier.low', lang);

  if (loading) {
    return (
      <div style={{ paddingTop: 72, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f1419' }}>
        <div style={{ color: '#8899a6', fontSize: 16 }}>Loading analytics...</div>
      </div>
    );
  }

  const langLabels: Record<string, string> = { en: 'English', ru: 'Русский', kz: 'Қазақша' };
  const langColors: Record<string, string> = { en: '#007484', ru: '#C9A96E', kz: '#ef5350' };
  const intentLabels: Record<string, string> = {
    unit_recommendation: t('intent.unit_recommendation', lang),
    price_inquiry: t('intent.price_inquiry', lang),
    dp_calculation: t('intent.dp_calculation', lang),
    location_info: t('intent.location_info', lang),
    general_faq: t('intent.general_faq', lang),
    booking_inquiry: t('intent.booking_inquiry', lang),
    greeting: t('intent.greeting', lang),
  };

  return (
    <div style={{ paddingTop: 72, background: '#0f1419', minHeight: '100vh' }}>
      {/* Header */}
      <section style={{
        background: 'linear-gradient(135deg, #1a2332, #223C50)',
        padding: '48px 24px', textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', color: '#f0f4f8', marginBottom: 8 }}>
          {t('analytics.title', lang)}
        </h1>
        <p style={{ color: '#8899a6', fontSize: 14 }}>
          {t('analytics.desc', lang)}
        </p>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
          {[
            { label: t('analytics.total_chats', lang), value: fmt(data?.totalChats || 0), icon: '💬', color: '#007484' },
            { label: t('analytics.total_leads', lang), value: fmt(data?.totalLeads || 0), icon: '👤', color: '#C9A96E' },
            { label: t('analytics.hot_leads', lang), value: fmt(data?.hotLeads || 0), icon: '🔥', color: '#ef5350' },
            { label: t('analytics.conversion', lang), value: `${data?.conversionRate || 0}%`, icon: '📈', color: '#00c853' },
          ].map((kpi, i) => (
            <div key={i} className="card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{
                position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                borderRadius: '50%', background: `${kpi.color}10`, filter: 'blur(20px)',
              }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>{kpi.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: kpi.color, marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 13, color: '#8899a6' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24, marginBottom: 32 }}>
          {/* Intent Distribution */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 16, color: '#f0f4f8', marginBottom: 20 }}>{t('analytics.intent_dist', lang)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(data?.intentCounts || {}).sort((a, b) => b[1] - a[1]).map(([intent, count]) => {
                const total = Object.values(data?.intentCounts || {}).reduce((s, c) => s + c, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={intent}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                      <span style={{ color: '#8899a6' }}>{intentLabels[intent] || intent}</span>
                      <span style={{ color: '#f0f4f8', fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 3,
                        background: 'linear-gradient(90deg, #007484, #00a3b8)',
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(data?.intentCounts || {}).length === 0 && (
                <p style={{ color: '#536471', fontSize: 13, textAlign: 'center', padding: 20 }}>
                  No conversation data yet. Start chatting to see analytics.
                </p>
              )}
            </div>
          </div>

          {/* Language Usage */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: 16, color: '#f0f4f8', marginBottom: 20 }}>{t('analytics.languages', lang)}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {Object.entries(data?.languageDistribution || {}).map(([lang, count]) => {
                const total = Object.values(data?.languageDistribution || {}).reduce((s, c) => s + c, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 80, fontSize: 13, color: '#8899a6' }}>{langLabels[lang] || lang}</div>
                    <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', width: `${pct}%`, borderRadius: 4,
                        background: langColors[lang] || '#007484',
                      }} />
                    </div>
                    <div style={{ width: 50, textAlign: 'right', fontSize: 13, color: '#f0f4f8', fontWeight: 600 }}>{Math.round(pct)}%</div>
                  </div>
                );
              })}
              {Object.keys(data?.languageDistribution || {}).length === 0 && (
                <p style={{ color: '#536471', fontSize: 13, textAlign: 'center', padding: 20 }}>
                  No language data yet.
                </p>
              )}
            </div>

            {/* Most Recommended Units */}
            <h3 style={{ fontSize: 16, color: '#f0f4f8', marginTop: 32, marginBottom: 16 }}>{t('analytics.top_units', lang)}</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(data?.unitCounts || {}).sort((a, b) => b[1] - a[1]).map(([code, count]) => (
                <div key={code} style={{
                  background: 'rgba(0,116,132,0.15)', border: '1px solid rgba(0,116,132,0.3)',
                  borderRadius: 10, padding: '8px 14px', fontSize: 13,
                }}>
                  <span style={{ color: '#00a3b8', fontWeight: 700 }}>{code}</span>
                  <span style={{ color: '#536471', marginLeft: 6 }}>×{count}</span>
                </div>
              ))}
              {Object.keys(data?.unitCounts || {}).length === 0 && (
                <p style={{ color: '#536471', fontSize: 13 }}>No recommendations yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="card" style={{ padding: '24px', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
            <h3 style={{ fontSize: 16, color: '#f0f4f8', margin: 0 }}>{t('analytics.pipeline', lang)}</h3>
            
            {/* Legend */}
            <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#8899a6', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={t('analytics.legend.hot', lang)}>
                <span style={{ color: '#00c853', fontWeight: 600 }}>{t('analytics.tier.high', lang)} (75+)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={t('analytics.legend.warm', lang)}>
                <span style={{ color: '#ff9800', fontWeight: 600 }}>{t('analytics.tier.medium', lang)} (40+)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} title={t('analytics.legend.cold', lang)}>
                <span style={{ color: '#536471', fontWeight: 600 }}>{t('analytics.tier.low', lang)}</span>
              </div>
            </div>
          </div>

          {leads.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {[
                    t('analytics.table.score', lang), t('analytics.table.name', lang), t('analytics.table.whatsapp', lang), 
                    t('analytics.table.budget', lang), t('analytics.table.purpose', lang), t('analytics.table.interest', lang), 
                    t('analytics.table.language', lang), t('analytics.table.status', lang), t('analytics.table.date', lang)
                  ].map((h, idx) => (
                    <th key={idx} style={{ color: '#536471', fontWeight: 600, padding: '10px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: tierColor(lead.score), fontWeight: 700 }}>
                        {tierLabel(lead.score)} {lead.score}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#f0f4f8' }}>{lead.name || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#00a3b8' }}>{lead.whatsapp || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#f0f4f8' }}>{lead.budget ? `${(lead.budget / 1_000_000).toFixed(1)}M ₸` : '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#8899a6' }}>{lead.purpose || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#C9A96E', fontWeight: 600 }}>{lead.interest || '—'}</td>
                    <td style={{ padding: '10px 12px', color: '#8899a6' }}>{lead.language?.toUpperCase()}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        background: 'rgba(0,116,132,0.15)', color: '#00a3b8',
                        padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                      }}>{lead.status}</span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#536471', whiteSpace: 'nowrap' }}>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#536471', fontSize: 14, textAlign: 'center', padding: 32 }}>
              {t('analytics.no_leads', lang)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
