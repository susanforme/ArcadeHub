import { useCallback } from 'react';
import { useSettings } from '../app/store';
import { translateRenderedText } from './rendered-text';
import { type TranslationKey, translate } from './translate';

export function t(
  key: TranslationKey,
  values?: Record<string, string | number>,
) {
  return translate(key, useSettings.getState().language, values);
}
export function localizeText(text: string) {
  return translateRenderedText(text, useSettings.getState().language);
}
export function useI18n() {
  const language = useSettings((state) => state.language);
  const localized = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(key, language, values),
    [language],
  );
  const text = useCallback(
    (value: string) => translateRenderedText(value, language),
    [language],
  );
  return { language, t: localized, text };
}
