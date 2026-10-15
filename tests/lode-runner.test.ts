import { describe, expect, test } from '@rstest/core';
import { levels } from '../src/games/lode-runner/levels';
import { isLodeSnapshot } from '../src/games/lode-runner/logic';
import {
  createLodeRunner,
  type LodeGame,
  type LodeSnapshot,
} from '../src/games/lode-runner/vendor/engine';

function noGuards(game: LodeGame) {
  const saved = game.snapshot();
  for (const column of saved.map)
    for (const cell of column)
      if (cell.act === 8) cell.act = cell.base === 7 ? 0 : cell.base;
  saved.guards = [];
  saved.shaking = [];
  saved.reborn = [];
  saved.moveId = 0;
  game.restore(saved);
}
function tick(game: LodeGame, count: number, action = 0) {
  for (let i = 0; i < count; i++) game.tick(action);
}
function clearGold(saved: LodeSnapshot) {
  for (const column of saved.map)
    for (const cell of column)
      if (cell.base === 7) {
        cell.base = 0;
        cell.bitmap = null;
      }
}

describe('Lode Runner classic campaign', () => {
  test('contains all 150 original 28 × 16 stages with restorable initial states', () => {
    expect(levels).toHaveLength(150);
    levels.forEach((level, index) => {
      expect(level).toHaveLength(28 * 16);
      expect(level.replace(/[ #@H\-XS$0&]/g, '')).toBe('');
      expect([...level].filter((tile) => tile === '&')).toHaveLength(1);
      const game = createLodeRunner({ level: index, seed: 1 });
      expect(game.level).toBe(index);
      expect(isLodeSnapshot(game.snapshot())).toBe(true);
    });
  });
  test('waits for movement before advancing guards or timers', () => {
    const game = createLodeRunner({ seed: 42 });
    const before = game.snapshot();
    tick(game, 100);
    expect(game.snapshot()).toEqual(before);
    game.tick(1);
    expect(game.phase).toBe('playing');
    expect(game.snapshot().runner.pos.xOffset).toBe(-8);
  });
  test('digging takes 11 ticks and an empty hole refills with the original timing', () => {
    const game = createLodeRunner({ seed: 42 });
    noGuards(game);
    game.tick(7);
    expect(game.snapshot().hole.action).toBe(9);
    tick(game, 10);
    expect(game.snapshot().fills).toHaveLength(0);
    game.tick();
    expect(game.snapshot().map[13][15].act).toBe(0);
    expect(game.snapshot().fills).toHaveLength(1);
    tick(game, 185);
    expect(game.snapshot().map[13][15].act).toBe(0);
    game.tick();
    expect(game.snapshot().map[13][15].act).toBe(1);
    expect(game.snapshot().fills).toHaveLength(0);
  });
  test('collecting the last gold reveals every exit ladder and awards 250 points', () => {
    const game = createLodeRunner({ seed: 42 });
    noGuards(game);
    const saved = game.snapshot();
    const goldSprite = saved.map.flat().find((tile) => tile.base === 7)?.bitmap;
    expect(goldSprite).toBeTruthy();
    clearGold(saved);
    const { x, y } = saved.runner.pos;
    saved.map[x][y].base = 7;
    saved.map[x][y].bitmap = goldSprite
      ? { ...goldSprite, x: x * 40, y: y * 44 }
      : null;
    saved.goldCount = 1;
    saved.phase = 'playing';
    game.restore(saved);
    game.tick();
    expect(game.gold).toBe(0);
    expect(game.score).toBe(250);
    expect(game.snapshot().goldComplete).toBe(1);
    expect(
      game
        .snapshot()
        .map.flat()
        .some((tile) => tile.base === 6),
    ).toBe(false);
    expect(game.snapshot().map[18][0].base).toBe(3);
  });
  test('reaching the top after collecting gold advances and grants one extra life', () => {
    const game = createLodeRunner({ seed: 42 });
    noGuards(game);
    const saved = game.snapshot();
    clearGold(saved);
    saved.map[saved.runner.pos.x][saved.runner.pos.y].act = 0;
    saved.runner.pos = { x: 18, y: 0, xOffset: 0, yOffset: 0 };
    saved.runner.sprite.x = 720;
    saved.runner.sprite.y = 0;
    saved.map[18][0].act = 9;
    saved.goldCount = 0;
    saved.goldComplete = 1;
    saved.phase = 'playing';
    game.restore(saved);
    game.tick();
    expect(game.phase).toBe('clear');
    expect(game.score).toBe(1500);
    tick(game, 28);
    expect(game.level).toBe(1);
    expect(game.lives).toBe(6);
    expect(game.phase).toBe('ready');
  });
  test('a trapped guard drops carried gold, then respawns when the hole closes', () => {
    const game = createLodeRunner({ seed: 42 });
    const guard = game.snapshot().guards[0];
    noGuards(game);
    game.tick(7);
    tick(game, 11);
    const saved = game.snapshot();
    clearGold(saved);
    saved.goldCount = 1;
    guard.pos = { x: 13, y: 14, xOffset: 0, yOffset: 0 };
    guard.sprite.x = 520;
    guard.sprite.y = 616;
    guard.sprite.spriteSheet = 'redhat';
    guard.hasGold = 20;
    saved.guards = [guard];
    saved.map[13][14].act = 8;
    game.restore(saved);
    tick(game, 20);
    const trapped = game.snapshot();
    expect(trapped.guards[0].action).toBe(10);
    expect(trapped.guards[0].hasGold).toBe(0);
    expect(trapped.map[13][14].base).toBe(7);
    expect(game.score).toBe(75);
    trapped.fills[0].curFrameIdx = 3;
    trapped.fills[0].curFrameTime = 3;
    game.restore(trapped);
    game.tick();
    expect(game.snapshot().guards[0].action).toBe(12);
    expect(game.snapshot().guards[0].pos.y).toBe(1);
    expect(game.snapshot().map[13][15].act).toBe(1);
    expect(game.score).toBe(150);
    expect(isLodeSnapshot(game.snapshot())).toBe(true);
  });
  test('checkpoint restores holes, guard AI, sprite timing and random state exactly', () => {
    const game = createLodeRunner({ seed: 42 });
    game.tick(7);
    tick(game, 14);
    const saved = game.snapshot();
    expect(saved.fills).toHaveLength(1);
    expect(isLodeSnapshot(saved)).toBe(true);
    const restored = createLodeRunner({ seed: 3 });
    restored.restore(saved);
    expect(restored.snapshot()).toEqual(saved);
    for (let frame = 0; frame < 400; frame++) {
      const action = frame < 12 ? 2 : frame < 30 ? 1 : 0;
      game.tick(action);
      restored.tick(action);
      expect(restored.snapshot()).toEqual(game.snapshot());
    }
  });
  test('retry consumes a life and returns to the same level; the last life ends the game', () => {
    const game = createLodeRunner({ level: 11, lives: 2, seed: 42 });
    game.retry();
    expect(game.lives).toBe(1);
    expect(game.phase).toBe('dead');
    tick(game, 18);
    expect(game.level).toBe(11);
    expect(game.phase).toBe('ready');
    game.retry();
    tick(game, 18);
    expect(game.phase).toBe('over');
  });
  test('rejects malformed boards, guard queues and incomplete digging checkpoints', () => {
    const saved = createLodeRunner({ seed: 1 }).snapshot();
    expect(isLodeSnapshot({ ...saved, map: [] })).toBe(false);
    expect(isLodeSnapshot({ ...saved, level: 150 })).toBe(false);
    expect(isLodeSnapshot({ ...saved, shaking: [6] })).toBe(false);
    expect(
      isLodeSnapshot({
        ...saved,
        born: { columns: Array(28).fill(0), index: 0 },
      }),
    ).toBe(false);
    expect(
      isLodeSnapshot({ ...saved, hole: { ...saved.hole, action: 9 } }),
    ).toBe(false);
    expect(
      isLodeSnapshot({
        ...saved,
        runner: { ...saved.runner, pos: { x: -1, y: 0 } },
      }),
    ).toBe(false);
    expect(isLodeSnapshot({ ...saved, rng: Number.NaN })).toBe(false);
  });
});
