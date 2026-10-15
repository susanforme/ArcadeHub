import { describe, expect, test } from '@rstest/core';
import {
  fishSize,
  isFeedingState,
  newFeedingState,
  stepFeeding,
} from '../src/games/feeding-frenzy/logic';

describe('feeding frenzy', () => {
  test('eats smaller fish and advances size at ten meals', () => {
    const s = newFeedingState();
    s.eaten = 9;
    s.spawn = 1;
    s.fish = [{ id: 1, x: 300, y: 350, size: 20, vx: 10, phase: 0 }];
    s.nextId = 2;
    stepFeeding(s, 0.01, { x: 300, y: 350 });
    expect(s.eaten).toBe(10);
    expect(fishSize(s.eaten)).toBe(68);
    expect(s.fish).toHaveLength(0);
    expect(s.score).toBe(100);
  });
  test('predator contact costs one life during invulnerability', () => {
    const s = newFeedingState();
    s.spawn = 1;
    s.grace = 0;
    s.fish = [
      { id: 1, x: 300, y: 350, size: 90, vx: 1, phase: 0 },
      { id: 2, x: 300, y: 350, size: 90, vx: 1, phase: 0 },
    ];
    s.nextId = 3;
    stepFeeding(s, 0.01, { x: 300, y: 350 });
    expect(s.lives).toBe(2);
    stepFeeding(s, 0.01, { x: 300, y: 350 });
    expect(s.lives).toBe(2);
  });
  test('bounded motion and snapshot validation reject corrupt and completed sessions', () => {
    const s = newFeedingState();
    expect(isFeedingState(s)).toBe(true);
    stepFeeding(s, 50, { x: 10000, y: -10000 }, () => 0.5);
    expect(s.x).toBeLessThan(320);
    expect(isFeedingState(s)).toBe(true);
    expect(isFeedingState({ ...s, eaten: 50 })).toBe(false);
    expect(isFeedingState({ ...s, lives: NaN })).toBe(false);
    expect(isFeedingState({ ...s, fish: [null] })).toBe(false);
  });
});
