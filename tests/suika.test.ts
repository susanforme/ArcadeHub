import { describe, expect, test } from '@rstest/core';
import {
  dropFruit,
  FLOOR,
  isSuikaState,
  newSuika,
  RADII,
  stepSuika,
} from '../src/games/suika/logic';

describe('Watermelon Merge', () => {
  test('a fruit is consumed once even in a three-fruit collision', () => {
    const s = newSuika(1);
    s.fruits = [1, 2, 3].map((id) => ({
      id,
      kind: 0,
      x: 240,
      y: 500,
      vx: 0,
      vy: 0,
      age: 2,
    }));
    s.nextId = 4;
    stepSuika(s, 0.001);
    expect(s.fruits.map((f) => f.kind).sort()).toEqual([0, 1]);
    expect(s.score).toBe(3);
  });
  test('drop cooldown and seeded queue survive a JSON roundtrip', () => {
    const s = newSuika(99);
    expect(dropFruit(s)).toBe(true);
    expect(dropFruit(s)).toBe(false);
    for (let i = 0; i < 10; i++) stepSuika(s, 0.1);
    const copy = JSON.parse(JSON.stringify(s));
    expect(isSuikaState(copy)).toBe(true);
    dropFruit(s);
    dropFruit(copy);
    stepSuika(s, 0.1);
    stepSuika(copy, 0.1);
    expect(copy).toEqual(s);
  });
  test('a resting fruit settles at the floor and does not overflow', () => {
    const s = newSuika(1);
    dropFruit(s);
    for (let i = 0; i < 100; i++) stepSuika(s, 0.1);
    expect(s.fruits[0].y).toBeCloseTo(FLOOR - RADII[s.fruits[0].kind], 1);
    expect(s.over).toBe(false);
    expect(Math.abs(s.fruits[0].vy)).toBeLessThan(5);
  });
  test('a new fruit above the warning line gets grace to fall', () => {
    const s = newSuika();
    dropFruit(s);
    stepSuika(s, 0.1);
    expect(s.overflow).toBe(0);
    expect(s.over).toBe(false);
  });
  test('an overflowing pile ends the game and prevents further drops', () => {
    const s = newSuika();
    s.fruits = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      kind: 10,
      x: 240,
      y: 540 - i * 204,
      vx: 0,
      vy: 0,
      age: 3,
    }));
    s.nextId = 9;
    for (let i = 0; i < 40 && !s.over; i++) stepSuika(s, 0.1);
    expect(s.over).toBe(true);
    expect(dropFruit(s)).toBe(false);
  });
  test('watermelons do not merge beyond the final image tier', () => {
    const s = newSuika();
    s.fruits = [1, 2].map((id) => ({
      id,
      kind: 10,
      x: 240,
      y: 520,
      vx: 0,
      vy: 0,
      age: 3,
    }));
    s.nextId = 3;
    stepSuika(s, 0.01);
    expect(s.fruits).toHaveLength(2);
    expect(s.score).toBe(0);
  });
  test('rejects non-finite, duplicate and out-of-range snapshots', () => {
    const s = newSuika();
    dropFruit(s);
    expect(isSuikaState({ ...s, aim: NaN })).toBe(false);
    expect(isSuikaState({ ...s, next: 11 })).toBe(false);
    expect(isSuikaState({ ...s, fruits: [s.fruits[0], s.fruits[0]] })).toBe(
      false,
    );
    expect(isSuikaState({ ...s, fruits: [null] })).toBe(false);
  });
});
