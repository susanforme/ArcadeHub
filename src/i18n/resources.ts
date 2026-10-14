import en from './locales/en.json';
import zh from './locales/zh.json';

export type Language = 'zh' | 'en';
export type TranslationKey = keyof typeof zh;
export const resources: Record<Language, Record<TranslationKey, string>> = {
  zh,
  en,
};
const keys = new Set(Object.keys(zh));
export function isTranslationKey(key: string): key is TranslationKey {
  return keys.has(key);
}
