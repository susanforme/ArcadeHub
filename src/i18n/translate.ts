import { type Language, resources, type TranslationKey } from './resources';

export type { Language, TranslationKey } from './resources';
export function translate(
  key: TranslationKey,
  language: Language,
  values: Record<string, string | number> = {},
): string {
  const message = resources[language][key];
  if (message === undefined) throw new Error(`Missing translation key: ${key}`);
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    String(values[name] ?? placeholder),
  );
}
