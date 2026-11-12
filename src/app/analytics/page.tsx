'use client';
import { useState, useEffect } from 'react';
import { t, Language } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';

interface Analytics {
  totalChats: number; totalLeads: number; hotLeads: number; conversionRate: number;
  intentCounts: Record<string, number>; unitCounts: Record<string, number>;
  languageDistribution: Record<string, number>;
}
interface Lead {
  id: string; sessionId: string; name?: string; whatsapp?: string; budget?: number;
  purpose?: string; interest?: string; status: string; score: number;
  language: string; createdAt: string;
}

export default function AnalyticsPage() {
  const { lang } = useLanguage();
  const [data, setData] = useState<Analytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/analytics').then((r) => { if (!r.ok) throw new Error('Analytics error'); return r.json(); }),
      fetch('/api/leads').then((r) => { if (!r.ok) throw new Error('Leads error'); return r.json(); }),
    ]).then(([analytics, leadList]) => {
      if (!active) return;
      setData(analytics);
      setLeads(Array.isArray(leadList) ? leadList : []);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const labels = {
    en: { kicker: 'ATAMURA / INSIGHTS', empty: 'No data available yet.', error: 'Unable to load analytics.', loading: 'Loading analytics...', recommended: 'Most recommended units' },
    ru: { kicker: 'ATAMURA / АНАЛИТИКА', empty: 'Данных пока нет.', error: 'Не удалось загрузить аналитику.', loading: 'Загрузка аналитики...', recommended: 'Популярные квартиры' },
    kz: { kicker: 'ATAMURA / АНАЛИТИКА', empty: 'Әзірше деректер жоқ.', error: 'Аналитиканы жүктеу мүмкін болмады.', loading: 'Аналитика жүктелуде...', recommended: 'Көп ұсынылатын пәтерлер' },
  }[lang];
  const metrics = [
    { label: t('analytics.total_chats', lang), value: data?.totalChats ?? 0 },
    { label: t('analytics.total_leads', lang), value: data?.totalLeads ?? 0 },
    { label: t('analytics.hot_leads', lang), value: data?.hotLeads ?? 0 },
    { label: t('analytics.conversion', lang), value: `${data?.conversionRate ?? 0}%` },
  ];
  const intentLabels: Record<string,string> = {
    unit_recommendation: t('intent.unit_recommendation', lang),
    price_inquiry: t('intent.price_inquiry', lang),
    dp_calculation: t('intent.dp_calculation', lang),
    location_info: t('intent.location_info', lang),
    general_faq: t('intent.general_faq', lang),
    booking_inquiry: t('intent.booking_inquiry', lang),
    greeting: t('intent.greeting', lang),
  };
  const languages: Record<string,string> = { en: 'English', ru: 'Русский', kz: 'Қазақша' };
  const intentValues = Object.entries(data?.intentCounts ?? {}).sort((a,b) => b[1] - a[1]);
  const languageValues = Object.entries(data?.languageDistribution ?? {}).sort((a,b) => b[1] - a[1]);
  const intentTotal = intentValues.reduce((sum,[,n]) => sum + n,0);
  const languageTotal = languageValues.reduce((sum,[,n]) => sum + n,0);
  const columns = [
    t('analytics.table.score',lang), t('analytics.table.name',lang),
    t('analytics.table.whatsapp',lang), t('analytics.table.budget',lang),
    t('analytics.table.purpose',lang), t('analytics.table.interest',lang),
    t('analytics.table.language',lang), t('analytics.table.status',lang),
    t('analytics.table.date',lang),
  ];
  const tier = (n:number) => n >= 75 ? t('analytics.tier.high',lang) : n >= 40 ? t('analytics.tier.medium',lang) : t('analytics.tier.low',lang);

  return (
    <main className="dashboard-shell">
      <div className="container">
        <header className="page-intro">
          <span className="eyebrow">{labels.kicker}</span>
          <h1>{t('analytics.title',lang)}</h1>
          <p>{t('analytics.desc',lang)}</p>
        </header>
        {loading ? <div className="catalog-state" role="status">{labels.loading}</div> :
          error ? <div className="catalog-state" role="alert">{labels.error}</div> : (
          <>
            <section className="dashboard-metrics" aria-label="Performance summary">
              {metrics.map((item) => (
                <div className="dashboard-metric" key={item.label}>
                  <strong>{typeof item.value === 'number' ? item.value.toLocaleString('ru-RU') : item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </section>
            <div className="dashboard-panels">
              <section className="dashboard-panel" aria-labelledby="intents-title">
                <h2 id="intents-title">{t('analytics.intent_dist',lang)}</h2>
                {intentValues.length ? intentValues.map(([key,value]) => (
                  <div className="meter-row" key={key}>
                    <div className="meter-label"><span>{intentLabels[key] || key}</span><strong>{value}</strong></div>
                    <div className="meter-track"><div className="meter-fill" style={{width:`${intentTotal ? value/intentTotal*100 : 0}%`}} /></div>
                  </div>
                )) : <p className="empty-state">{labels.empty}</p>}
              </section>
              <section className="dashboard-panel" aria-labelledby="languages-title">
                <h2 id="languages-title">{t('analytics.languages',lang)}</h2>
                {languageValues.length ? languageValues.map(([key,value]) => (
                  <div className="meter-row" key={key}>
                    <div className="meter-label"><span>{languages[key] || key}</span><strong>{languageTotal ? Math.round(value/languageTotal*100) : 0}%</strong></div>
                    <div className="meter-track"><div className="meter-fill" style={{width:`${languageTotal ? value/languageTotal*100 : 0}%`}} /></div>
                  </div>
                )) : <p className="empty-state">{labels.empty}</p>}
                <h2 style={{marginTop:34}}>{labels.recommended}</h2>
                {Object.entries(data?.unitCounts || {}).length ? (
                  <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
                    {Object.entries(data?.unitCounts || {}).sort((a,b)=>b[1]-a[1]).map(([code,count])=>(
                      <span key={code} style={{fontSize:13,color:'#345a43'}}><strong>{code}</strong> · {count}</span>
                    ))}
                  </div>
                ) : <p className="empty-state">{labels.empty}</p>}
              </section>
            </div>
            <section className="lead-table-wrap" aria-labelledby="leads-title">
              <div className="lead-table-header">
                <h2 id="leads-title">{t('analytics.pipeline',lang)}</h2>
                <span style={{fontSize:12,color:'#758378'}}>{leads.length} {t('analytics.total_leads',lang).toLowerCase()}</span>
              </div>
              {leads.length ? (
                <table className="lead-table">
                  <thead><tr>{columns.map((column)=><th key={column}>{column}</th>)}</tr></thead>
                  <tbody>{leads.map((lead)=>(
                    <tr key={lead.id}>
                      <td><span className={`lead-score ${lead.score < 40 ? 'low' : lead.score < 75 ? 'medium' : ''}`}>{tier(lead.score)} · {lead.score}</span></td>
                      <td>{lead.name || '—'}</td>
                      <td>{lead.whatsapp || '—'}</td>
                      <td>{lead.budget ? `${(lead.budget/1_000_000).toFixed(1)}M ₸` : '—'}</td>
                      <td>{lead.purpose || '—'}</td><td>{lead.interest || '—'}</td>
                      <td>{lead.language?.toUpperCase() || '—'}</td><td>{lead.status || '—'}</td>
                      <td>{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              ) : <p className="empty-state">{t('analytics.no_leads',lang)}</p>}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
