import { expect, test } from '@rstest/core';
import { getByRole } from '@testing-library/dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettings } from '../src/app/store';
import { LanguageSelect } from '../src/components/LanguageSelect';
import { games } from '../src/core/game-registry';
import { drawLocalizedText } from '../src/games/browser-arcade/localized-text';
import { useI18n } from '../src/i18n';
import { translateRenderedText } from '../src/i18n/rendered-text';
import { resources } from '../src/i18n/resources';
import { translate } from '../src/i18n/translate';

test('semantic keys use named interpolation without depending on Chinese copy', () => {
  expect(translate('library.card.highScore', 'en', { score: '123,456' })).toBe(
    'High score 123,456',
  );
  expect(translate('games.pacman.gameOver', 'en', { level: 7 })).toBe(
    'Game over · Reached level 7',
  );
  expect(
    translate('games.pacman.hud', 'zh', {
      score: 20,
      level: 3,
      eaten: 100,
      total: 244,
    }),
  ).toBe('得分 20     关卡 3     豆子 100/244');
});

test('both locales expose identical stable keys and matching named placeholders', () => {
  expect(Object.keys(resources.en).sort()).toEqual(
    Object.keys(resources.zh).sort(),
  );
  for (const [key, zh] of Object.entries(resources.zh)) {
    expect(key).toMatch(/^[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/);
    expect(zh).not.toMatch(/\{\d+\}/);
    const placeholders = (value: string) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    expect(
      placeholders(resources.en[key as keyof typeof resources.en]),
    ).toEqual(placeholders(zh));
  }
});

test('the original-renderer adapter handles text without accepting it as a translation key', () => {
  expect(translateRenderedText('WAVE 12 COMPLETE', 'zh')).toBe('第 12 波完成');
  expect(translateRenderedText('> TRAINING <', 'zh')).toBe('> 训练 <');
  expect(translateRenderedText('42', 'zh')).toBe('42');
  expect(translateRenderedText('unknown', 'en')).toBe('unknown');
});

test('every game name, description, category and control has English localization', () => {
  for (const game of games) {
    for (const text of [
      game.name,
      game.subtitle,
      game.description,
      game.category,
      ...game.controls.flatMap((control) => [control.key, control.description]),
      ...game.touchControls.map((control) => control.label),
      ...(game.virtualGamepad?.buttons?.map((button) => button.label) ?? []),
    ]) {
      expect(translateRenderedText(text, 'en')).not.toMatch(/[\u4e00-\u9fff]/);
    }
  }
});

test('Phaser CanvasTexture text follows live language without restarting a game', () => {
  const drawn: string[] = [];
  const ctx = {
    save() {},
    restore() {},
    measureText: () => ({ width: 20 }),
    fillText: (text: string) => drawn.push(text),
  } as unknown as CanvasRenderingContext2D;
  useSettings.getState().setLanguage('zh');
  expect(drawLocalizedText(ctx, 'PRESS ENTER TO START', 0, 0, 7, '#fff')).toBe(
    true,
  );
  expect(drawn).toEqual(['按 Enter 开始']);
  useSettings.getState().setLanguage('en');
  expect(drawLocalizedText(ctx, 'PRESS ENTER TO START', 0, 0, 7, '#fff')).toBe(
    false,
  );
  useSettings.getState().setLanguage('zh');
});

function Preview() {
  const { t } = useI18n();
  return (
    <>
      <LanguageSelect />
      <span>{t('navigation.library')}</span>
    </>
  );
}

test('the library language selector updates live and restores the saved preference', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  useSettings.getState().setLanguage('zh');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  try {
    act(() => root.render(<Preview />));
    const selector = getByRole<HTMLSelectElement>(host, 'combobox', {
      name: '游戏语言',
    });
    act(() => {
      selector.value = 'en';
      selector.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(host.textContent).toContain('Game library');
    expect(
      JSON.parse(localStorage.getItem('arcadehub-settings') ?? '{}').state
        .language,
    ).toBe('en');
    await act(async () => {
      await useSettings.persist.rehydrate();
    });
    expect(useSettings.getState().language).toBe('en');
    act(() => useSettings.getState().setLanguage('zh'));
    expect(host.textContent).toContain('游戏大厅');
  } finally {
    act(() => root.unmount());
    host.remove();
    useSettings.getState().setLanguage('zh');
  }
});
