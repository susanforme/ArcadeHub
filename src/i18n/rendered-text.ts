import {
  isTranslationKey,
  type Language,
  resources,
  type TranslationKey,
} from './resources';
import { translate } from './translate';

const normalize = (text: string) =>
  text.replace(/\s+/g, ' ').trim().toUpperCase();
const exact = new Map<string, TranslationKey>();
const patterns: { regex: RegExp; names: string[]; key: TranslationKey }[] = [];
for (const key of Object.keys(resources.en) as TranslationKey[]) {
  for (const source of [resources.zh[key], resources.en[key]]) {
    exact.set(normalize(source), key);
    if (!source.includes('{')) continue;
    const names: string[] = [];
    const sourceNames = [...source.matchAll(/\{(\w+)\}/g)].map(
      (match) => match[1],
    );
    const escaped = normalize(source).replace(/[.*+?^$()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\{(\w+)\}/g, () => {
      names.push(sourceNames[names.length]);
      return '(.+?)';
    });
    patterns.push({ regex: new RegExp(`^${pattern}$`), names, key });
  }
}
patterns.sort((a, b) => b.regex.source.length - a.regex.source.length);

// Original Canvas renderers supply text, not IDs. Keep their adapter outside the keyed API.
export function translateRenderedText(
  text: string,
  language: Language,
): string {
  if (isTranslationKey(text)) return translate(text, language);
  const source = normalize(text);
  const key = exact.get(source);
  if (key) return translate(key, language);
  for (const pattern of patterns) {
    const match = source.match(pattern.regex);
    if (!match) continue;
    const values = Object.fromEntries(
      pattern.names.map((name, i) => {
        const value = match[i + 1];
        const nested = exact.get(normalize(value));
        return [name, nested ? translate(nested, language) : value];
      }),
    );
    return translate(pattern.key, language, values);
  }
  return text;
}
