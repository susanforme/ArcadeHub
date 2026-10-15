import { describe, expect, test } from '@rstest/core';
import { COLS, isDigState, newDig, stepDig } from '../src/games/dig-dug/logic';

describe('Dig Dug', () => {
  test('starts only on input and validates all generated rounds', () => {
    for (let level = 1; level < 20; level++)
      expect(isDigState(newDig(level))).toBe(true);
    const s = newDig();
    stepDig(s, {});
    expect(s.ticks).toBe(0);
    stepDig(s, { direction: 0 });
    expect(s.phase).toBe('playing');
  });
  test('pump inflates a connected enemy until it bursts', () => {
    const s = newDig();
    s.phase = 'playing';
    s.enemies = [{ x: 8, y: 9, kind: 0, air: 0, timer: 0, fire: 0, dir: 0 }];
    for (let i = 0; i < 12; i++) stepDig(s, { pump: true });
    expect(s.enemies).toHaveLength(0);
    expect(s.phase).toBe('clear');
    expect(s.score).toBeGreaterThan(500);
    for (let i = 0; i < 18; i++) stepDig(s, {});
    expect(s.level).toBe(2);
  });
  test('dirt blocks the hose and movement excavates it', () => {
    const s = newDig();
    s.phase = 'playing';
    s.dirt[9 * COLS + 8] = 1;
    stepDig(s, { pump: true });
    expect(s.hose).toBe(0);
    stepDig(s, { direction: 0 });
    expect(s.dirt[9 * COLS + 8]).toBe(0);
  });
  test('a falling rock crushes multiple enemies and awards increasing points', () => {
    const s = newDig();
    s.phase = 'playing';
    s.rocks = [{ x: 2, y: 4, timer: 7, falling: true, hits: 0 }];
    s.dirt[5 * COLS + 2] = 0;
    s.enemies = [0, 1].map((kind) => ({
      x: 2,
      y: 5,
      kind,
      air: 1,
      timer: 18,
      fire: 0,
      dir: 0 as const,
    }));
    stepDig(s, {});
    expect(s.enemies).toHaveLength(0);
    expect(s.score).toBe(2000);
  });
  test('contact consumes a life once and terminal state cannot restore', () => {
    const s = newDig();
    s.phase = 'playing';
    s.lives = 1;
    s.player.invincible = 0;
    s.enemies = [{ x: 7, y: 9, kind: 0, air: 0, timer: 0, fire: 0, dir: 0 }];
    stepDig(s, {});
    expect(s.phase).toBe('over');
    expect(isDigState(s)).toBe(false);
  });
  test('restored state evolves identically and malformed saves are rejected', () => {
    const s = newDig();
    for (let i = 0; i < 50; i++) stepDig(s, { direction: 2, pump: true });
    const restored = JSON.parse(JSON.stringify(s));
    expect(isDigState(restored)).toBe(true);
    for (let i = 0; i < 10; i++) {
      stepDig(s, { pump: true });
      stepDig(restored, { pump: true });
    }
    expect(restored).toEqual(s);
    expect(isDigState({ ...newDig(), dirt: [] })).toBe(false);
    expect(isDigState({ ...newDig(), player: { x: NaN, y: 0 } })).toBe(false);
  });
});
