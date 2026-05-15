'use client';
import { createContext, useContext, useState, ReactNode } from 'react';
import { Language } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  cycleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  cycleLang: () => {},
});

const nextLang: Record<Language, Language> = { en: 'ru', ru: 'kz', kz: 'en' };

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const cycleLang = () => setLang(nextLang[lang]);
  return (
    <LanguageContext.Provider value={{ lang, setLang, cycleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
