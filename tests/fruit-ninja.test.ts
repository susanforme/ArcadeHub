import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  type Fruit,
  HEIGHT,
  intersects,
  isNinjaState,
  newNinja,
  newNinjaSwipe,
  sliceNinja,
  startNinja,
  stepNinja,
} from '../src/games/fruit-ninja/logic';

function playing() {
  const state = newNinja();
  startNinja(state);
  return state;
}
function fruit(id: number, kind: Fruit['kind'] = 'apple', x = 200): Fruit {
  return { id, kind, x, y: 300, vx: 0, vy: -50, angle: 0, spin: 10 };
}
const from = { x: 100, y: 300 };
const to = { x: 650, y: 300 };

describe('fruit ninja', () => {
  test('discovers a complete pointer-first arcade entry with no gamepad overlay', () => {
    const game = games.find((entry) => entry.id === 'fruit-ninja');
    expect(game?.category).toBe('categories.arcade');
    expect(game?.virtualGamepad).toBeUndefined();
    expect(game?.touchControls).toEqual([]);
  });
  test('waits at the title screen without spawning or spending time', () => {
    const state = newNinja();
    stepNinja(state, 20);
    expect(state).toEqual(newNinja());
    expect(sliceNinja(state, from, to, () => 1).cut).toEqual([]);
    expect(startNinja(state)).toBe(true);
    expect(startNinja(state)).toBe(false);
  });
  test('swept blade collision catches fast swipes, boundaries, and reverse swipes', () => {
    expect(intersects(from, to, { x: 400, y: 300 }, 30)).toBe(true);
    expect(intersects(to, from, { x: 400, y: 330 }, 30)).toBe(true);
    expect(intersects(from, to, { x: 400, y: 331 }, 30)).toBe(false);
    expect(intersects(from, from, from, 30)).toBe(false);
    expect(intersects(from, to, { x: 40, y: 300 }, 30)).toBe(false);
    expect(
      intersects(
        { x: 164.75, y: 300 },
        { x: 165.25, y: 300 },
        { x: 200, y: 300 },
        35,
      ),
    ).toBe(true);
  });
  test('fruit scores only once; three in one swipe earn the combo bonus', () => {
    const state = playing();
    state.fruits = [fruit(1), fruit(2, 'sandia', 350), fruit(3, 'banana', 500)];
    state.nextId = 4;
    const result = sliceNinja(state, from, to, () => 1);
    expect(result.cut).toHaveLength(3);
    expect(result.bonus).toBe(3);
    expect(state.score).toBe(6);
    expect(state.fruits).toEqual([]);
    sliceNinja(state, from, to, () => 1);
    expect(state.score).toBe(6);
  });
  test('one continuous swipe earns double fruit points, including slow movement', () => {
    const state = playing();
    const swipe = newNinjaSwipe();
    state.nextId = 6;
    for (let i = 1; i <= 4; i++) {
      state.fruits = [fruit(i)];
      state.elapsed += 0.2;
      sliceNinja(state, from, to, () => 1, swipe);
    }
    expect(state.score).toBe(8);
    expect(swipe.combo).toBe(4);
    state.elapsed += 0.31;
    state.fruits = [fruit(5)];
    expect(sliceNinja(state, from, to, () => 1, swipe).bonus).toBe(0);
    expect(swipe.combo).toBe(1);
  });
  test('separate fingers, a new contact, and a reversal cannot share a combo', () => {
    const state = playing();
    const swipe = newNinjaSwipe();
    state.nextId = 6;
    state.fruits = [fruit(1), fruit(2)];
    sliceNinja(state, from, to, () => 1, swipe);
    state.fruits = [fruit(3)];
    expect(sliceNinja(state, from, to, () => 1, newNinjaSwipe()).bonus).toBe(0);
    state.fruits = [fruit(4)];
    expect(sliceNinja(state, to, from, () => 1, swipe).bonus).toBe(0);
    state.fruits = [fruit(5)];
    expect(sliceNinja(state, from, to, () => 1).bonus).toBe(0);
    expect(state.score).toBe(5);
  });
  test('movement through empty space keeps the same swipe alive; hovering does not', () => {
    const state = playing();
    const swipe = newNinjaSwipe();
    state.nextId = 4;
    state.fruits = [fruit(1), fruit(2)];
    sliceNinja(state, from, to, () => 1, swipe);
    state.elapsed += 0.2;
    sliceNinja(state, from, to, () => 1, swipe);
    state.elapsed += 0.2;
    state.fruits = [fruit(3)];
    expect(sliceNinja(state, from, to, () => 1, swipe).bonus).toBe(3);
    const before = structuredClone(state);
    expect(sliceNinja(state, from, from, () => 0, swipe).critical).toEqual([]);
    expect(state).toEqual(before);
  });
  test('critical hits are random, award ten extra points, and combine with a combo', () => {
    const state = playing();
    state.nextId = 4;
    state.fruits = [fruit(1), fruit(2), fruit(3)];
    const rolls = [0.049, 0.05, 0.9];
    const result = sliceNinja(state, from, to, () => rolls.shift() ?? 1);
    expect(result.critical.map((f) => f.id)).toEqual([1]);
    expect(result.bonus).toBe(3);
    expect(state.score).toBe(16);
    expect(sliceNinja(state, from, to, () => 0).critical).toEqual([]);
    expect(state.score).toBe(16);
  });
  test('each hundred-point boundary restores one missing life, once', () => {
    const state = playing();
    state.score = 99;
    state.misses = 2;
    state.nextId = 4;
    state.fruits = [fruit(1)];
    expect(sliceNinja(state, from, to, () => 1).recovered).toBe(1);
    expect(state.score).toBe(100);
    expect(state.misses).toBe(1);
    state.fruits = [fruit(2)];
    expect(sliceNinja(state, from, to, () => 1).recovered).toBe(0);
    expect(state.misses).toBe(1);
    state.score = 199;
    const resumed = JSON.parse(JSON.stringify(state));
    expect(isNinjaState(resumed)).toBe(true);
    resumed.fruits = [fruit(3)];
    expect(sliceNinja(resumed, from, to, () => 1).recovered).toBe(1);
    expect(resumed.misses).toBe(0);
    expect(newNinja().misses).toBe(0);
  });
  test('full health cannot bank spare lives or restore a later miss retroactively', () => {
    const state = playing();
    state.score = 99;
    state.nextId = 3;
    state.fruits = [fruit(1)];
    expect(sliceNinja(state, from, to, () => 1).recovered).toBe(0);
    expect(state.misses).toBe(0);
    state.misses = 1;
    state.fruits = [fruit(2)];
    expect(sliceNinja(state, from, to, () => 1).recovered).toBe(0);
    expect(state.misses).toBe(1);
  });
  test('a combo with criticals can cross two recovery boundaries in one event', () => {
    const state = playing();
    state.score = 98;
    state.misses = 2;
    state.nextId = 11;
    state.fruits = Array.from({ length: 10 }, (_, i) => fruit(i + 1));
    const result = sliceNinja(state, from, to, () => 0);
    expect(state.score).toBe(218);
    expect(result.recovered).toBe(2);
    expect(state.misses).toBe(0);
    expect(isNinjaState(state)).toBe(true);
  });
  test('a bomb ends the run immediately and the same segment awards no fruit points', () => {
    const state = playing();
    state.fruits = [fruit(1), fruit(2, 'boom', 400)];
    const result = sliceNinja(state, from, to, () => 1);
    expect(result.bomb?.kind).toBe('boom');
    expect(result.cut).toEqual([]);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('over');
    expect(state.reason).toBe('bomb');
    expect(sliceNinja(state, from, to, () => 1).cut).toEqual([]);
    const before = structuredClone(state);
    stepNinja(state, 1);
    expect(state).toEqual(before);
  });
  test('falling fruit counts as a miss once, while bombs can fall safely', () => {
    const state = playing();
    state.spawnIn = 2;
    state.fruits = [fruit(1), fruit(2, 'boom')].map((f) => ({
      ...f,
      y: HEIGHT + 69,
      vy: 200,
    }));
    expect(stepNinja(state, 0.02)).toHaveLength(1);
    expect(state.misses).toBe(1);
    expect(state.fruits).toEqual([]);
    stepNinja(state, 0.02);
    expect(state.misses).toBe(1);
    state.misses = 2;
    state.fruits = [{ ...fruit(3), y: HEIGHT + 69, vy: 200 }];
    stepNinja(state, 0.02);
    expect(state.phase).toBe('over');
    expect(state.reason).toBe('miss');
  });
  test('launches fruit on an arc; early waves are safe and later waves include bombs', () => {
    const state = playing();
    state.spawnIn = 0;
    stepNinja(state, 0.01, () => 0);
    expect(state.wave).toBe(1);
    expect(state.fruits).toHaveLength(2);
    expect(state.fruits.every((f) => f.kind !== 'boom')).toBe(true);
    const y = state.fruits[0].y;
    for (let i = 0; i < 50; i++) stepNinja(state, 0.01, () => 0);
    expect(state.fruits[0].y).toBeLessThan(y - 200);
    state.fruits = [];
    state.wave = 2;
    state.spawnIn = 0;
    stepNinja(state, 0.01, () => 0);
    expect(state.fruits.some((f) => f.kind === 'boom')).toBe(true);
  });
  test('a long deterministic run keeps spawn counts and saved physics bounded', () => {
    const state = playing();
    for (let i = 0; i < 18000; i++) {
      stepNinja(state, 1 / 60, () => 0.5);
      state.fruits = state.fruits.filter((f) => f.y > 400 || f.kind === 'boom');
      expect(isNinjaState(state)).toBe(true);
      expect(state.fruits.length).toBeLessThanOrEqual(16);
    }
    expect(state.wave).toBeGreaterThan(100);
  });
  test('late waves vary in size and spacing without stacking fruit at screen edges', () => {
    for (const roll of [0, 0.5, 0.999]) {
      const state = playing();
      state.wave = 40;
      state.spawnIn = 0;
      stepNinja(state, 0.01, () => roll);
      expect(state.fruits).toHaveLength(2 + Math.floor(roll * 5));
      const positions = state.fruits.map((f) => f.x);
      expect(new Set(positions).size).toBe(positions.length);
      expect(Math.min(...positions)).toBeGreaterThanOrEqual(70);
      expect(Math.max(...positions)).toBeLessThanOrEqual(730);
      expect(isNinjaState(state)).toBe(true);
    }
  });
  test('a large wave respects the total object limit even with eleven fruit still in flight', () => {
    const state = playing();
    state.wave = 40;
    state.spawnIn = 0;
    state.nextId = 12;
    state.fruits = Array.from({ length: 11 }, (_, i) => fruit(i + 1));
    stepNinja(state, 0.01, () => 0.999);
    expect(state.fruits).toHaveLength(16);
    expect(isNinjaState(state)).toBe(true);
  });
  test('snapshots round-trip and reject invalid, duplicate, or ended state', () => {
    const state = playing();
    state.spawnIn = 0;
    stepNinja(state, 0.01, () => 0.5);
    expect(isNinjaState(newNinja())).toBe(true);
    expect(isNinjaState(JSON.parse(JSON.stringify(state)))).toBe(true);
    for (const patch of [
      { version: 2 },
      { phase: 'over' },
      { phase: 'other' },
      { reason: 'bomb' },
      { score: -1 },
      { misses: 3 },
      { elapsed: NaN },
      { wave: -1 },
      { spawnIn: Infinity },
      { fruits: {} },
      { fruits: [null] },
      { fruits: [state.fruits[0], state.fruits[0]] },
      { fruits: [{ ...state.fruits[0], kind: 'unknown' }] },
      { fruits: [{ ...state.fruits[0], vx: Infinity }] },
      { nextId: 1 },
      { comboUntil: 50 },
      { phase: 'ready' },
    ])
      expect(isNinjaState({ ...state, ...patch })).toBe(false);
    expect(isNinjaState(null)).toBe(false);
    expect(isNinjaState([])).toBe(false);
  });
});
