'use client';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { t, Language } from '@/lib/i18n';

const copy: Record<Language, {
  kicker: string; heading: string; headingQuiet: string; intro: string; explore: string;
  talk: string; note1: string; note2: string; aboutTitle: string; aboutDesc: string;
  collectionTitle: string; collectionDesc: string; plan: string; paymentTitle: string;
  paymentDesc: string; paymentNote: string; locationTitle: string; locationDesc: string;
  map: string; render: string;
}> = {
  en: {
    kicker: 'KERUEN / ALMATY', heading: 'Room to live.', headingQuiet: 'Space to belong.',
    intro: 'A considered residential community at the foothills of the Trans-Ili Alatau. Explore apartments with space for the way you live.',
    explore: 'Explore apartments', talk: 'Speak with our team', note1: 'Tuzdybastau · Almaty', note2: '1, 2 & 3-room layouts',
    aboutTitle: 'Designed for the everyday.', aboutDesc: 'Simple details make a place feel like home. From well-planned apartments to a calmer pace just outside the city.',
    collectionTitle: 'Find your kind of space.', collectionDesc: 'Browse floor plans by room count. Prices and availability are displayed in the apartment catalog.',
    plan: 'View floor plans', paymentTitle: 'A clear way to purchase.', paymentDesc: 'Explore the payment routes available for KERUEN. Final eligibility and terms should be confirmed with the sales team.',
    paymentNote: 'Calculations are indicative. Confirm the latest prices, availability and financing terms before making a decision.',
    locationTitle: 'Close to the city. Closer to nature.', locationDesc: 'KERUEN is located in Tuzdybastau, on the outskirts of Almaty. A quieter setting with access to everyday services and the surrounding landscape.',
    map: 'View location on maps', render: 'Architectural visualization · for illustration',
  },
  ru: {
    kicker: 'KERUEN / АЛМАТЫ', heading: 'Место для жизни.', headingQuiet: 'Пространство для вас.',
    intro: 'Продуманный жилой комплекс у подножия Заилийского Алатау. Выберите квартиру для вашего образа жизни.',
    explore: 'Смотреть квартиры', talk: 'Связаться с отделом продаж', note1: 'Туздыбастау · Алматы', note2: '1, 2 и 3-комнатные планировки',
    aboutTitle: 'Для каждого дня.', aboutDesc: 'Дом создаётся из деталей: функциональные планировки, спокойная атмосфера и близость к городу.',
    collectionTitle: 'Найдите своё пространство.', collectionDesc: 'Выберите планировку по количеству комнат. Цены и наличие — в каталоге квартир.',
    plan: 'Смотреть планировки', paymentTitle: 'Понятные способы покупки.', paymentDesc: 'Изучите варианты оплаты в KERUEN. Актуальные условия уточняйте в отделе продаж.',
    paymentNote: 'Расчёты ориентировочные. Уточните стоимость, наличие и условия финансирования перед покупкой.',
    locationTitle: 'Рядом с городом. Ближе к природе.', locationDesc: 'KERUEN расположен в Туздыбастау, в пригороде Алматы. Спокойная атмосфера и доступ к городской инфраструктуре.',
    map: 'Посмотреть на карте', render: 'Визуализация проекта · иллюстрация',
  },
  kz: {
    kicker: 'KERUEN / АЛМАТЫ', heading: 'Өмірге орын.', headingQuiet: 'Өзіңізге кеңістік.',
    intro: 'Іле Алатауының етегіндегі ойластырылған тұрғын үй кешені. Өмір салтыңызға сай пәтерді таңдаңыз.',
    explore: 'Пәтерлерді қарау', talk: 'Сату бөліміне хабарласу', note1: 'Тұздыбастау · Алматы', note2: '1, 2 және 3 бөлмелі жоспарлар',
    aboutTitle: 'Күнделікті өмір үшін.', aboutDesc: 'Үй жайлылығы ұсақ бөлшектерден басталады: ыңғайлы жоспарлар, тыныш орта және қалаға жақындық.',
    collectionTitle: 'Өзіңізге лайық кеңістік.', collectionDesc: 'Бөлме саны бойынша жоспарды таңдаңыз. Баға мен қолжетімділік каталогта көрсетіледі.',
    plan: 'Жоспарларды қарау', paymentTitle: 'Сатып алудың түсінікті жолы.', paymentDesc: 'KERUEN төлем тәсілдерін қарастырыңыз. Нақты шарттарды сату бөлімінен растаңыз.',
    paymentNote: 'Есептеулер алдын ала берілген. Сатып алмас бұрын баға мен қаржыландыру шарттарын нақтылаңыз.',
    locationTitle: 'Қалаға жақын. Табиғатқа жақынырақ.', locationDesc: 'KERUEN Алматы маңындағы Тұздыбастауда орналасқан. Тыныш орта мен күнделікті инфрақұрылымға қолайлы қолжетімділік.',
    map: 'Картадан көру', render: 'Жобаның визуализациясы · иллюстрация',
  },
};

export default function Home() {
  const { lang } = useLanguage();
  const c = copy[lang];
  const values = [
    { title: t('highlight.eco', lang), desc: t('highlight.eco_desc', lang) },
    { title: t('highlight.mountain', lang), desc: t('highlight.mountain_desc', lang) },
    { title: t('highlight.seismic', lang), desc: t('highlight.seismic_desc', lang) },
    { title: t('highlight.location', lang), desc: t('highlight.location_desc', lang) },
  ];
  const layouts = [
    { type: '1BR', image: '/layouts/1br.png', description: '1 ' + t('units.rooms', lang) },
    { type: '2BR', image: '/layouts/2br.png', description: '2 ' + t('units.rooms', lang) },
    { type: '3BR', image: '/layouts/3br.png', description: '3 ' + t('units.rooms', lang) },
  ];
  const payments = [
    { title: t('payment.full', lang), description: t('payment.full_desc', lang) },
    { title: t('payment.installment', lang), description: t('payment.installment_desc', lang) },
    { title: t('payment.mortgage', lang), description: t('payment.mortgage_desc', lang) },
  ];
  return (
    <main>
      <section className="editorial-hero" aria-labelledby="home-title">
        <div className="editorial-hero-copy">
          <p className="eyebrow">{c.kicker}</p>
          <h1 id="home-title">{c.heading}<em>{c.headingQuiet}</em></h1>
          <p className="editorial-intro">{c.intro}</p>
          <div className="editorial-actions">
            <Link href="/units" className="btn-primary">{c.explore} <span aria-hidden="true">↗</span></Link>
            <a href="tel:+77007001111" className="btn-secondary">{c.talk}</a>
          </div>
          <div className="editorial-hero-notes"><span>{c.note1}</span><span>{c.note2}</span></div>
        </div>
        <div className="editorial-hero-visual">
          {/* Published architectural visualization; not a photograph of the completed building. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://storage.googleapis.com/bd-kz-01/buildings-v2/2560x1920/47843.jpg" alt="KERUEN residential complex architectural visualization" />
          <p className="editorial-photo-note">KERUEN<br />{c.render}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="about-title">
        <div className="container">
          <span className="section-index">01 / KERUEN</span>
          <div className="section-heading">
            <h2 id="about-title">{c.aboutTitle}</h2>
            <p>{c.aboutDesc}</p>
          </div>
          <div className="editorial-values">
            {values.map((item, index) => (
              <article key={item.title} className="editorial-value">
                <span className="editorial-number">0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section collection-section" aria-labelledby="collection-title">
        <div className="container">
          <span className="section-index">02 / APARTMENTS</span>
          <div className="section-heading">
            <h2 id="collection-title">{c.collectionTitle}</h2><p>{c.collectionDesc}</p>
          </div>
          <div className="collection-grid">
            {layouts.map((item) => (
              <Link href="/units" className="collection-card" key={item.type}>
                <div className="collection-art">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.type + ' floor plan'} loading="lazy" />
                </div>
                <div className="collection-meta">
                  <div><h3>{item.type}</h3><p>{item.description} · {c.plan}</p></div>
                  <span aria-hidden="true" className="collection-arrow">↗</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section editorial-payment" aria-labelledby="payment-title">
        <div className="container">
          <span className="section-index">03 / PAYMENT</span>
          <div className="section-heading">
            <h2 id="payment-title">{c.paymentTitle}</h2><p>{c.paymentDesc}</p>
          </div>
          <div className="payment-columns">
            {payments.map((payment, index) => (
              <article key={payment.title} className="payment-column">
                <span className="editorial-number">0{index + 1}</span>
                <h3>{payment.title}</h3><p>{payment.description}</p>
              </article>
            ))}
          </div>
          <p style={{color:'#b9cbbf', fontSize:11, marginTop:44, maxWidth:670}}>{c.paymentNote}</p>
        </div>
      </section>

      <section className="section" aria-labelledby="location-title">
        <div className="container editorial-location">
          <div>
            <span className="section-index">04 / LOCATION</span>
            <h2 id="location-title">{c.locationTitle}</h2>
            <p>{c.locationDesc}</p>
            <a className="btn-secondary" href="https://www.google.com/maps/search/?api=1&query=Tuzdybastau%2C%20Almaty" target="_blank" rel="noopener noreferrer">{c.map} <span aria-hidden="true">↗</span></a>
          </div>
          <div className="location-graphic" role="img" aria-label="Location card: Tuzdybastau near Almaty">
            <div className="location-graphic-content"><strong>KERUEN</strong><span>Tuzdybastau · Almaty</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
