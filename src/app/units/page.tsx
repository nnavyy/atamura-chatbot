'use client';
import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { formatTenge, getAllPaymentOptions } from '@/lib/calculator';

interface Unit {
  id: string; code: string; type: string; rooms: number; areaSqm: number;
  priceMin: number; status: string; view?: string; floor?: string;
  features?: string; floorPlan?: string;
}
type PaymentTab = 'full' | 'installment' | 'mortgage';

export default function UnitsPage() {
  const { lang } = useLanguage();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filter, setFilter] = useState('All');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [payTab, setPayTab] = useState<PaymentTab>('installment');

  useEffect(() => {
    let active = true;
    fetch('/api/units')
      .then((res) => { if (!res.ok) throw new Error('Unable to load units'); return res.json(); })
      .then((data) => { if (active) setUnits(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setFetchError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedUnit) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedUnit(null); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [selectedUnit]);

  const tabs = ['All', '1BR', '2BR', '3BR'];
  const filtered = filter === 'All' ? units : units.filter((unit) => unit.type === filter);
  const statusLabels: Record<string, string> = {
    available: t('units.available', lang), reserved: t('units.reserved', lang), sold: t('units.sold', lang),
  };
  const plans: Record<number, string> = { 1: '/layouts/1br.png', 2: '/layouts/2br.png', 3: '/layouts/3br.png' };
  const paymentLabels: Record<PaymentTab, string> = {
    full: t('payment.full', lang),
    installment: t('payment.installment', lang),
    mortgage: t('payment.mortgage', lang),
  };
  const info = {
    en: { kicker: 'KERUEN / APARTMENTS', availability: 'Availability and prices are subject to confirmation.', details: 'View apartment details', close: 'Close details', noUnits: 'No apartments match this filter.', loading: 'Loading apartments...', error: 'Apartment data could not be loaded. Please try again later.', monthly: 'Monthly payment', tenure: 'Term', interest: 'Annual interest rate', months: 'months', savings: 'Savings', premium: 'Additional financing cost', note: 'Illustrative estimate only. The sales team and bank will confirm final pricing and conditions.', contact: 'Contact sales', type: 'Layout', cta: 'View Details & Calculator →' },
    ru: { kicker: 'KERUEN / КВАРТИРЫ', availability: 'Наличие и цены необходимо уточнять.', details: 'Подробнее о квартире', close: 'Закрыть', noUnits: 'Нет квартир по выбранному фильтру.', loading: 'Загрузка квартир...', error: 'Не удалось загрузить квартиры.', monthly: 'Ежемесячный платёж', tenure: 'Срок', interest: 'Годовая ставка', months: 'мес.', savings: 'Экономия', premium: 'Переплата', note: 'Предварительный расчёт. Точные условия подтвердят менеджер и банк.', contact: 'Связаться с отделом продаж', type: 'Планировка', cta: 'Подробнее и расчёт →' },
    kz: { kicker: 'KERUEN / ПӘТЕРЛЕР', availability: 'Баға мен қолжетімділікті нақтылау қажет.', details: 'Пәтер туралы толық ақпарат', close: 'Жабу', noUnits: 'Бұл сүзгіге сай пәтер табылмады.', loading: 'Пәтерлер жүктелуде...', error: 'Пәтерлер туралы ақпаратты жүктеу мүмкін болмады.', monthly: 'Ай сайынғы төлем', tenure: 'Мерзімі', interest: 'Жылдық мөлшерлеме', months: 'ай', savings: 'Үнем', premium: 'Артық төлем', note: 'Алдын ала есеп. Нақты шарттарды менеджер мен банк растайды.', contact: 'Сату бөліміне хабарласу', type: 'Жоспар', cta: 'Толығырақ және есептеу →' },
  }[lang];
  const calc = selectedUnit ? getAllPaymentOptions(selectedUnit.priceMin, selectedUnit.code)[payTab] : null;

  const formatRoomCount = (count: number) => {
    if (lang === 'ru') {
      if (count === 1) return '1 комната';
      if (count >= 2 && count <= 4) return `${count} комнаты`;
      return `${count} комнат`;
    }
    if (lang === 'kz') return `${count} бөлме`;
    return count === 1 ? '1 room' : `${count} rooms`;
  };

  return (
    <main className="catalog-shell">
      <div className="container">
        <header className="page-intro">
          <span className="eyebrow">{info.kicker}</span>
          <h1>{t('units.title', lang)}</h1>
          <p>{t('units.desc', lang)} {info.availability}</p>
        </header>
        <div className="filter-bar" role="group" aria-label="Filter apartments by room type">
          {tabs.map((tab) => (
            <button id={`filter-${tab.toLowerCase()}`} className="filter-button" type="button" aria-pressed={filter === tab} key={tab} onClick={() => setFilter(tab)}>
              {tab === 'All' ? t('units.all', lang) : tab}
            </button>
          ))}
        </div>

        {loading ? <div className="catalog-state" role="status">{info.loading}</div>
        : fetchError ? <div className="catalog-state" role="alert">{info.error}</div>
        : filtered.length === 0 ? <div className="catalog-state">{info.noUnits}</div>
        : (
          <div className="listing-grid">
            {filtered.map((unit) => (
              <button key={unit.id} type="button" className="listing-card" disabled={unit.status === 'sold'} onClick={() => { setSelectedUnit(unit); setPayTab('installment'); }} aria-label={`${info.details} ${unit.code}`}>
                <div className="listing-plan">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unit.floorPlan || plans[unit.rooms] || '/layouts/1br.png'} alt={`Unit ${unit.code} floor plan`} loading="lazy" />
                </div>
                <div className="listing-body">
                  <div className="listing-top">
                    <div className="listing-title-group">
                      <h3>Unit {unit.code}</h3>
                      <span className="unit-type-tag">{unit.type}</span>
                    </div>
                    <span className={`listing-status-pill ${unit.status}`}>
                      <span className={`status-dot ${unit.status}`} />
                      {statusLabels[unit.status] || unit.status}
                    </span>
                  </div>
                  <p className="listing-details">
                    <strong>{unit.areaSqm} m²</strong> · {formatRoomCount(unit.rooms)}{unit.view ? ` · ${unit.view}` : ''}
                  </p>
                  <div className="listing-price">
                    <small>{t('units.starting_from', lang)}</small>
                    <strong>{formatTenge(unit.priceMin)}</strong>
                    <span>{Math.round(unit.priceMin / unit.areaSqm).toLocaleString('ru-RU')} ₸/m²</span>
                  </div>
                  <div className="listing-cta-btn">
                    {unit.status === 'sold'
                      ? (lang === 'ru' ? 'Квартира продана' : lang === 'kz' ? 'Пәтер сатылды' : 'Sold Out')
                      : info.cta}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUnit && calc && (
        <div className="modal-backdrop" onClick={() => setSelectedUnit(null)}>
          <section className="unit-modal" role="dialog" aria-modal="true" aria-labelledby="unit-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="unit-modal-head">
              <div>
                <span className="section-index">KERUEN / {info.type.toUpperCase()}</span>
                <h2 id="unit-modal-title">Unit {selectedUnit.code}</h2>
                <p style={{color:'#6d7a70',fontSize:13,marginTop:8}}>{selectedUnit.type} · {selectedUnit.areaSqm} m² · {selectedUnit.rooms} {t('units.rooms', lang)}</p>
              </div>
              <button className="modal-close" aria-label={info.close} type="button" onClick={() => setSelectedUnit(null)}>×</button>
            </div>
            <div className="unit-modal-grid">
              <div className="unit-modal-plan">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedUnit.floorPlan || plans[selectedUnit.rooms]} alt={`Floor plan for unit ${selectedUnit.code}`} />
              </div>
              <div className="unit-modal-calc">
                <div className="payment-tabs" role="group" aria-label="Payment method">
                  {(['full','installment','mortgage'] as const).map((tab) => (
                    <button className="payment-tab" type="button" aria-pressed={payTab === tab} key={tab} onClick={() => setPayTab(tab)}>{paymentLabels[tab]}</button>
                  ))}
                </div>
                <div className="calculation-rows">
                  <div className="calculation-row"><span>{t('payment.dp', lang)} ({calc.dpPercent}%)</span><strong>{formatTenge(calc.dp)}</strong></div>
                  {calc.monthly > 0 && <div className="calculation-row"><span>{info.monthly}</span><strong>{formatTenge(calc.monthly)}</strong></div>}
                  {calc.tenor > 0 && <div className="calculation-row"><span>{info.tenure}</span><strong>{calc.tenor} {info.months}</strong></div>}
                  {calc.interestRate > 0 && <div className="calculation-row"><span>{info.interest}</span><strong>{calc.interestRate}%</strong></div>}
                  <div className="calculation-row"><span>{t('payment.total', lang)}</span><strong>{formatTenge(calc.total)}</strong></div>
                  {calc.savings !== 0 && <div className="calculation-row"><span>{calc.savings > 0 ? info.savings : info.premium}</span><strong>{formatTenge(Math.abs(calc.savings))}</strong></div>}
                </div>
                <p className="modal-disclaimer">{info.note}</p>
                <a href="tel:+77007001111" className="btn-primary" style={{width:'100%',display:'block',textAlign:'center'}}>{info.contact} ↗</a>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
