export type Language = 'en' | 'ru' | 'kz';

const translations = {
  // Navigation
  'nav.home': { en: 'Home', ru: 'Главная', kz: 'Басты бет' },
  'nav.units': { en: 'Apartments', ru: 'Квартиры', kz: 'Пәтерлер' },
  'nav.analytics': { en: 'Analytics', ru: 'Аналитика', kz: 'Аналитика' },
  'nav.contact': { en: 'Contact', ru: 'Контакты', kz: 'Байланыс' },

  // Hero
  'hero.ai_available': { en: 'AI Property Consultant Available', ru: 'AI-консультант доступен', kz: 'AI кеңесшісі қолжетімді' },
  'hero.title_1': { en: 'Find Your', ru: 'Найди Свой', kz: 'Өз' },
  'hero.title_2': { en: 'Dream Home', ru: 'Дом Мечты', kz: 'Арманыңыздағы Үйді' },
  'hero.title_3': { en: 'in KERUEN', ru: 'в KERUEN', kz: 'KERUEN-нен Табыңыз' },
  'hero.subtitle': { en: 'ECO-comfort living in the foothills of Trans-Ili Alatau. Ask our AI consultant anything about apartments, prices, and payment plans.', ru: 'ЭКО-комфорт у подножия Заилийского Алатау. Спросите нашего ИИ-консультанта о квартирах, ценах и планах оплаты.', kz: 'Іле Алатауының бөктеріндегі ЭКО-жайлылық. Біздің жасанды интеллект кеңесшімізден пәтерлер, бағалар және төлем жоспарлары туралы сұраңыз.' },
  'hero.cta': { en: 'Explore Apartments →', ru: 'Посмотреть квартиры →', kz: 'Пәтерлерді қарау →' },

  // Stats
  'stats.projects': { en: 'Projects', ru: 'Проектов', kz: 'Жобалар' },
  'stats.years': { en: 'Years', ru: 'Лет', kz: 'Жылдар' },
  'stats.unit_types': { en: 'Unit Types', ru: 'Типов квартир', kz: 'Пәтер түрлері' },

  // Sections
  'section.why_title_1': { en: 'Why', ru: 'Почему', kz: 'Неге' },
  'section.why_title_2': { en: 'KERUEN?', ru: 'KERUEN?', kz: 'KERUEN?' },
  'section.why_desc': { en: 'Premium living designed around nature, safety, and modern comfort', ru: 'Премиум-жизнь, созданная вокруг природы, безопасности и современного комфорта', kz: 'Табиғат, қауіпсіздік және заманауи жайлылыққа негізделген премиум өмір' },
  
  'section.layout_title_1': { en: 'Choose Your', ru: 'Выберите Свою', kz: 'Өз' },
  'section.layout_title_2': { en: 'Layout', ru: 'Планировку', kz: 'Жобаңызды Таңдаңыз' },
  'section.layout_desc': { en: 'From compact studios to spacious 3-bedroom apartments', ru: 'От компактных студий до просторных 3-комнатных квартир', kz: 'Шағын студиялардан бастап кең 3 бөлмелі пәтерлерге дейін' },
  
  'section.payment_title_1': { en: 'Payment', ru: 'Способы', kz: 'Төлем' },
  'section.payment_title_2': { en: 'Methods', ru: 'Оплаты', kz: 'Тәсілдері' },
  'section.payment_desc': { en: 'Flexible options for every budget', ru: 'Гибкие варианты для любого бюджета', kz: 'Әр бюджетке арналған икемді нұсқалар' },
  
  'section.location_title_1': { en: 'Located in the', ru: 'В Самом', kz: 'Табиғаттың' },
  'section.location_title_2': { en: 'Heart of Nature', ru: 'Сердце Природы', kz: 'Жүрегінде Орналасқан' },
  'section.location_desc': { en: 'Tuzdybastau village, Talgarsky District — 20 minutes from Almaty center. Surrounded by mountains, fresh air, and modern infrastructure.', ru: 'Поселок Туздыбастау, Талгарский район — 20 минут от центра Алматы. В окружении гор, свежего воздуха и современной инфраструктуры.', kz: 'Тұздыбастау ауылы, Талғар ауданы — Алматы орталығынан 20 минуттық жерде. Таулар, таза ауа және заманауи инфрақұрылыммен қоршалған.' },

  // Chat
  'chat.title': { en: 'AI Property Consultant', ru: 'AI Консультант', kz: 'AI Кеңесші' },
  'chat.placeholder': { en: 'Ask about apartments...', ru: 'Спросите о квартирах...', kz: 'Пәтерлер туралы сұраңыз...' },
  'chat.welcome': {
    en: 'Hello! 👋 I\'m your AI property consultant for KERUEN. How can I help you find the perfect apartment?',
    ru: 'Здравствуйте! 👋 Я ваш AI-консультант по ЖК KERUEN. Чем могу помочь?',
    kz: 'Сәлеметсіз бе! 👋 Мен KERUEN бойынша AI-кеңесшіңізмін. Қалай көмектесе аламын?',
  },
  'chat.send': { en: 'Send', ru: 'Отправить', kz: 'Жіберу' },
  'chat.typing': { en: 'Typing...', ru: 'Печатает...', kz: 'Жазып жатыр...' },

  // Lead capture
  'lead.title': { en: 'Stay Connected', ru: 'Оставайтесь на связи', kz: 'Байланыста болыңыз' },
  'lead.subtitle': { en: 'Leave your contact and we\'ll reach out with personalized options', ru: 'Оставьте контакт и мы подберём варианты', kz: 'Байланыс деректеріңізді қалдырыңыз' },
  'lead.name': { en: 'Your name', ru: 'Ваше имя', kz: 'Атыңыз' },
  'lead.whatsapp': { en: 'WhatsApp number', ru: 'Номер WhatsApp', kz: 'WhatsApp нөмірі' },
  'lead.submit': { en: 'Send', ru: 'Отправить', kz: 'Жіберу' },
  'lead.thanks': { en: 'Thank you! Our team will contact you soon.', ru: 'Спасибо! Наша команда скоро свяжется с вами.', kz: 'Рахмет! Біздің команда сізге жақын арада хабарласады.' },
  'lead.skip': { en: 'Maybe later', ru: 'Позже', kz: 'Кейінірек' },

  // Units page
  'units.title_1': { en: 'Available', ru: 'Доступные', kz: 'Қолжетімді' },
  'units.title_2': { en: 'Apartments', ru: 'Квартиры', kz: 'Пәтерлер' },
  'units.desc': { en: 'Browse all KERUEN units. Click any apartment to see payment options.', ru: 'Просмотрите все квартиры KERUEN. Нажмите на любую, чтобы увидеть варианты оплаты.', kz: 'Барлық KERUEN пәтерлерін көріңіз. Төлем опцияларын көру үшін кез келген пәтерді басыңыз.' },
  'units.title': { en: 'Available Apartments', ru: 'Доступные квартиры', kz: 'Қолжетімді пәтерлер' },
  'units.all': { en: 'All', ru: 'Все', kz: 'Барлығы' },
  'units.area': { en: 'Area', ru: 'Площадь', kz: 'Ауданы' },
  'units.from': { en: 'from', ru: 'от', kz: 'бастап' },
  'units.available': { en: 'Available', ru: 'Доступно', kz: 'Қолжетімді' },
  'units.reserved': { en: 'Reserved', ru: 'Забронировано', kz: 'Брондалған' },
  'units.sold': { en: 'Sold', ru: 'Продано', kz: 'Сатылған' },
  'units.rooms': { en: 'rooms', ru: 'комнат', kz: 'бөлме' },
  'units.view_details': { en: 'View Details', ru: 'Подробнее', kz: 'Толығырақ' },
  'units.view': { en: 'View', ru: 'Вид', kz: 'Көрініс' },
  'units.floors': { en: 'Floors', ru: 'Этажи', kz: 'Қабаттар' },
  'units.starting_from': { en: 'Starting from', ru: 'Начиная от', kz: 'Бастап' },
  'units.area_title': { en: 'Area', ru: 'Площадь', kz: 'Ауданы' },
  'units.rooms_title': { en: 'Rooms', ru: 'Комнаты', kz: 'Бөлмелер' },
  'units.ask_ai': { en: 'Ask AI about this unit', ru: 'Спросить AI об этой квартире', kz: 'AI-дан осы пәтер туралы сұрау' },

  // Payment
  'payment.full': { en: 'Full Payment', ru: 'Полная оплата', kz: 'Толық төлем' },
  'payment.full_desc': { en: '100% payment with 3% discount', ru: '100% оплата со скидкой 3%', kz: '100% төлем 3% жеңілдікпен' },
  'payment.full_badge': { en: 'Best price', ru: 'Лучшая цена', kz: 'Ең жақсы баға' },
  'payment.installment': { en: 'Installment', ru: 'Рассрочка', kz: 'Бөліп төлеу' },
  'payment.installment_desc': { en: '30% DP, 0% interest, up to 36 months', ru: 'ПВ 30%, 0% переплаты, до 36 месяцев', kz: 'БЖ 30%, 0% үстемеақы, 36 айға дейін' },
  'payment.installment_badge': { en: '0% interest', ru: '0% переплаты', kz: '0% үстемеақы' },
  'payment.mortgage': { en: 'Mortgage', ru: 'Ипотека', kz: 'Несие' },
  'payment.mortgage_desc': { en: 'Through Otbasy Bank & Freedom Finance', ru: 'Через Отбасы Банк и Freedom Finance', kz: 'Отбасы Банкі және Freedom Finance арқылы' },
  'payment.mortgage_badge': { en: 'From 20% DP', ru: 'ПВ от 20%', kz: 'БЖ 20%-дан бастап' },
  'payment.dp': { en: 'Down Payment', ru: 'Первоначальный взнос', kz: 'Бастапқы жарна' },
  'payment.monthly': { en: 'Monthly', ru: 'Ежемесячно', kz: 'Ай сайын' },
  'payment.total': { en: 'Total', ru: 'Итого', kz: 'Барлығы' },

  // Highlights
  'highlight.eco': { en: 'ECO-Comfort', ru: 'ЭКО-Комфорт', kz: 'ЭКО-Жайлылық' },
  'highlight.eco_desc': { en: 'Green spaces & car-free courtyard', ru: 'Зелёные зоны и двор без машин', kz: 'Жасыл аймақтар және көліксіз аула' },
  'highlight.mountain': { en: 'Mountain Views', ru: 'Горный вид', kz: 'Тау көрінісі' },
  'highlight.mountain_desc': { en: 'Trans-Ili Alatau panorama', ru: 'Панорама Заилийского Алатау', kz: 'Іле Алатауы панорамасы' },
  'highlight.seismic': { en: 'Seismic Class 9', ru: 'Сейсмика 9', kz: 'Сейсмика 9' },
  'highlight.seismic_desc': { en: 'Maximum earthquake resistance', ru: 'Максимальная сейсмоустойчивость', kz: 'Максималды сейсмотұрақтылық' },
  'highlight.location': { en: '20 min from Almaty', ru: '20 мин от Алматы', kz: 'Алматыдан 20 мин' },
  'highlight.location_desc': { en: 'Near Mall Aport East & schools', ru: 'Рядом ТРЦ Aport East и школы', kz: 'Aport East ТРО және мектептер жақын' },

  // Footer
  'footer.rights': { en: '© 2026 Atamura Group. All rights reserved.', ru: '© 2026 Atamura Group. Все права защищены.', kz: '© 2026 Atamura Group. Барлық құқықтар қорғалған.' },
  'footer.tagline': { en: 'We Create Legacy', ru: 'Мы создаём наследие', kz: 'Біз мұра жасаймыз' },
  'footer.tagline_desc': { en: 'We Create Legacy. Premium ECO-comfort residential complexes in the foothills of Almaty.', ru: 'Мы создаем наследие. Жилые комплексы премиум ЭКО-комфорта у подножия гор Алматы.', kz: 'Біз мұра жасаймыз. Алматының тау бөктеріндегі премиум ЭКО-жайлы тұрғын үй кешендері.' },
  'footer.projects': { en: 'Projects', ru: 'Проекты', kz: 'Жобалар' },
  'footer.contact': { en: 'Contact', ru: 'Контакты', kz: 'Байланыс' },

  // Analytics
  'analytics.title': { en: 'Analytics Dashboard', ru: 'Панель аналитики', kz: 'Аналитика тақтасы' },
  'analytics.desc': { en: 'Chatbot performance & lead intelligence', ru: 'Эффективность чат-бота и анализ лидов', kz: 'Чат-боттың тиімділігі және лидтер аналитикасы' },
  'analytics.total_chats': { en: 'Total Conversations', ru: 'Всего бесед', kz: 'Барлық сұхбаттар' },
  'analytics.total_leads': { en: 'Total Leads', ru: 'Всего лидов', kz: 'Барлық лидтер' },
  'analytics.hot_leads': { en: 'High Intent Leads', ru: 'Лиды с высоким намерением', kz: 'Ниеті жоғары лидтер' },
  'analytics.conversion': { en: 'Conversion Rate', ru: 'Конверсия', kz: 'Конверсия' },
  'analytics.top_units': { en: 'Most Recommended', ru: 'Самые рекомендуемые', kz: 'Ең ұсынылатын' },
  'analytics.languages': { en: 'Language Usage', ru: 'Использование языков', kz: 'Тіл қолдану' },
  'analytics.table.score': { en: 'Score', ru: 'Оценка', kz: 'Ұпай' },
  'analytics.table.name': { en: 'Name', ru: 'Имя', kz: 'Аты' },
  'analytics.table.whatsapp': { en: 'WhatsApp', ru: 'WhatsApp', kz: 'WhatsApp' },
  'analytics.table.budget': { en: 'Budget', ru: 'Бюджет', kz: 'Бюджет' },
  'analytics.table.purpose': { en: 'Purpose', ru: 'Цель', kz: 'Мақсаты' },
  'analytics.table.interest': { en: 'Interest', ru: 'Интерес', kz: 'Қызығушылығы' },
  'analytics.table.language': { en: 'Language', ru: 'Язык', kz: 'Тілі' },
  'analytics.table.status': { en: 'Status', ru: 'Статус', kz: 'Статусы' },
  'analytics.table.date': { en: 'Date', ru: 'Дата', kz: 'Күні' },
  'analytics.legend.title': { en: 'Lead Scoring Guide', ru: 'Руководство по оценке лидов', kz: 'Лидтерді бағалау нұсқаулығы' },
  'analytics.legend.hot': { en: 'High intent, ready to buy or book a viewing', ru: 'Высокое намерение, готов купить или забронировать', kz: 'Жоғары ниет, сатып алуға немесе брондауға дайын' },
  'analytics.legend.warm': { en: 'Interested, asking about prices and layouts', ru: 'Заинтересован, спрашивает о ценах и планировках', kz: 'Қызығушылық танытуда, бағалар мен жоспарлар туралы сұрайды' },
  'analytics.legend.cold': { en: 'General questions, low immediate intent', ru: 'Общие вопросы, низкое немедленное намерение', kz: 'Жалпы сұрақтар, төменгі ниет' },
  'analytics.tier.high': { en: 'High', ru: 'Высокий', kz: 'Жоғары' },
  'analytics.tier.medium': { en: 'Medium', ru: 'Средний', kz: 'Орташа' },
  'analytics.tier.low': { en: 'Low', ru: 'Низкий', kz: 'Төмен' },
  'analytics.intent_dist': { en: 'Intent Distribution', ru: 'Распределение намерений', kz: 'Ниеттің таралуы' },
  'analytics.pipeline': { en: 'Lead Pipeline', ru: 'Воронка лидов', kz: 'Лидтер құбыры' },
  'intent.unit_recommendation': { en: 'Unit Recommendation', ru: 'Рекомендация квартиры', kz: 'Пәтер ұсынысы' },
  'intent.price_inquiry': { en: 'Price Inquiry', ru: 'Запрос цены', kz: 'Бағаны сұрау' },
  'intent.dp_calculation': { en: 'DP Calculation', ru: 'Расчет ПВ', kz: 'БЖ есептеу' },
  'intent.location_info': { en: 'Location Info', ru: 'Информация о локации', kz: 'Орналасу туралы ақпарат' },
  'intent.general_faq': { en: 'General FAQ', ru: 'Общие вопросы', kz: 'Жалпы сұрақтар' },
  'intent.booking_inquiry': { en: 'Booking', ru: 'Бронирование', kz: 'Брондау' },
  'intent.greeting': { en: 'Greeting', ru: 'Приветствие', kz: 'Сәлемдесу' },
  'analytics.no_leads': { en: 'No leads yet. Start conversations through the chatbot to generate leads.', ru: 'Пока нет лидов. Начните беседу через чат-бот, чтобы генерировать лиды.', kz: 'Әзірге лидтер жоқ. Лидтер жасау үшін чат-бот арқылы сөйлесуді бастаңыз.' },
} as const;

type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Language = 'en'): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry.en;
}

export function detectLanguage(text: string): Language {
  const kazakh = /[ұүқғәіңө]/i;
  const russian = /[а-яё]/i;
  if (kazakh.test(text)) return 'kz';
  if (russian.test(text)) return 'ru';
  return 'en';
}
