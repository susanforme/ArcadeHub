import { expect, test } from '@rstest/core';
import { getByRole } from '@testing-library/dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useSettings } from '../src/app/store';
import { GameCard } from '../src/components/GameCard';
import { createRegistry, games } from '../src/core/game-registry';
import { translate } from '../src/i18n/translate';

test('new games precede older games with deterministic ordering for a batch', () => {
  const base = games[0];
  expect(
    createRegistry([
      { ...base, id: 'older', addedAt: 1000 },
      { ...base, id: 'newer-b', addedAt: 2000 },
      { ...base, id: 'newer-a', addedAt: 2000 },
    ]).map((game) => game.id),
  ).toEqual(['newer-a', 'newer-b', 'older']);
  expect(games.every((game) => Number.isFinite(game.addedAt))).toBe(true);
  for (let i = 1; i < games.length; i++) {
    expect(games[i - 1].addedAt).toBeGreaterThanOrEqual(games[i].addedAt);
  }
});

test('favorites restore from storage and removing one preserves other favorites and settings', async () => {
  const previous = useSettings.getState();
  try {
    useSettings.setState({ favoriteIds: [] });
    useSettings.getState().toggleFavorite('snake');
    useSettings.getState().toggleFavorite('tetris');
    expect(useSettings.getState().favoriteIds).toEqual(['snake', 'tetris']);
    const persisted = localStorage.getItem('arcadehub-settings') ?? '{}';
    useSettings.setState({ favoriteIds: [] });
    localStorage.setItem('arcadehub-settings', persisted);
    await useSettings.persist.rehydrate();
    expect(useSettings.getState().favoriteIds).toEqual(['snake', 'tetris']);
    useSettings.getState().toggleFavorite('snake');
    expect(useSettings.getState().favoriteIds).toEqual(['tetris']);
    const saved = JSON.parse(
      localStorage.getItem('arcadehub-settings') ?? '{}',
    );
    expect(saved.state.favoriteIds).toEqual(['tetris']);
    expect(saved.state.language).toBe(previous.language);
    expect(saved.state.volume).toBe(previous.volume);
  } finally {
    useSettings.setState(previous);
  }
});

test('existing settings and malformed favorite data load safely', async () => {
  const previous = useSettings.getState();
  try {
    for (const favoriteIds of [
      undefined,
      null,
      'snake',
      ['snake', 1, 'snake'],
    ]) {
      localStorage.setItem(
        'arcadehub-settings',
        JSON.stringify({ state: { language: 'en', favoriteIds }, version: 0 }),
      );
      await useSettings.persist.rehydrate();
      expect(useSettings.getState().favoriteIds).toEqual(
        Array.isArray(favoriteIds) ? ['snake'] : [],
      );
      expect(useSettings.getState().language).toBe('en');
    }
  } finally {
    useSettings.setState(previous);
  }
});

test('a card heart toggles independently of its game link and reacts to restored favorites', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  const previous = useSettings.getState();
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const game = games[0];
  const name = translate(game.name, 'zh');
  try {
    useSettings.setState({ favoriteIds: [], language: 'zh' });
    act(() => root.render(<GameCard game={game} number={1} />));
    const button = getByRole(host, 'button', { name: `收藏${name}` });
    expect(button.closest('a')).toBeNull();
    expect(getByRole(host, 'link')).toHaveAttribute(
      'href',
      `#/game/${game.id}`,
    );
    act(() => button.click());
    expect(
      getByRole(host, 'button', { name: `取消收藏${name}` }),
    ).toHaveAttribute('aria-pressed', 'true');
    await act(async () => useSettings.persist.rehydrate());
    expect(button).toHaveAttribute('aria-pressed', 'true');
    act(() => button.click());
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(useSettings.getState().favoriteIds).toEqual([]);
  } finally {
    act(() => root.unmount());
    host.remove();
    useSettings.setState(previous);
  }
});
