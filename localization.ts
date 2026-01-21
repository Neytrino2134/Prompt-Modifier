
import { createContext, useContext, Dispatch, SetStateAction } from 'react';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { es } from './locales/es';
import { uz } from './locales/uz';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { it } from './locales/it';
import { pt } from './locales/pt';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { ko } from './locales/ko';

export const languages = {
  en: { name: 'English', short: 'EN', nativeName: 'English' },
  ru: { name: 'Russian', short: 'RU', nativeName: 'Русский' },
  es: { name: 'Spanish', short: 'ES', nativeName: 'Español' },
  fr: { name: 'French', short: 'FR', nativeName: 'Français' },
  de: { name: 'German', short: 'DE', nativeName: 'Deutsch' },
  it: { name: 'Italian', short: 'IT', nativeName: 'Italiano' },
  pt: { name: 'Portuguese', short: 'PT', nativeName: 'Português' },
  uz: { name: 'Uzbek', short: 'UZ', nativeName: "O'zbek" },
  zh: { name: 'Chinese', short: 'ZH', nativeName: '中文' },
  ja: { name: 'Japanese', short: 'JA', nativeName: '日本語' },
  ko: { name: 'Korean', short: 'KO', nativeName: '한국어' },
};

export type LanguageCode = keyof typeof languages;

const translationData: Record<string, any> = {
    en,
    ru,
    es,
    uz,
    fr,
    de,
    it,
    pt,
    zh,
    ja,
    ko
    // Other languages fall back to EN for now as we don't have full translation files yet
};

export type TranslationKey = keyof typeof en;

export const getTranslation = (lang: LanguageCode, key: TranslationKey, options?: { [key: string]: string | number }) => {
  const langData = translationData[lang] || translationData['en'];
  const enData = translationData['en'];
  
  // Fallback to EN if key is missing in selected language
  let text = langData[key] || enData[key] || key;
  
  if (options) {
    Object.entries(options).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
};

export interface LanguageContextType {
  // The language currently being displayed in the UI (either EN or Secondary)
  language: LanguageCode;
  setLanguage: Dispatch<SetStateAction<LanguageCode>>;
  
  // The user's preferred non-English language (e.g. RU or ES)
  secondaryLanguage: LanguageCode;
  setSecondaryLanguage: Dispatch<SetStateAction<LanguageCode>>;
  
  t: (key: TranslationKey, options?: { [key: string]: string | number }) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
