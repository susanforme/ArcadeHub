import { expect, test } from '@rstest/core';
import { createBomberman } from '../src/games/bomberman/vendor/runtime';

interface SavedState {
  phase: string;
  players: number;
  frames: number;
  randMap: number[][];
  newPlayer: {
    x: number;
    y: number;
    gridX: number;
    gridY: number;
    health: number;
    bombPower: number;
    bombs: number;
    speed: number;
    img: string;
  };
  newPlayer2: SavedState['newPlayer'] | null;
  enemies: unknown[];
  bombs: { remaining: number }[];
  flames: unknown[];
}
function engine() {
  const context = new Proxy({}, { get: () => () => {}, set: () => true });
  const canvas = {
    width: 750,
    height: 600,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  return createBomberman(
    canvas,
    {},
    (key, values) => `${key}:${values?.player ?? ''}`,
  );
}
function arena(multiplayer = false) {
  const game = engine();
  if (multiplayer) game.step({}, { MODE: true }, 0);
  game.step({}, { START: true }, 0);
  const saved = game.snapshot() as SavedState;
  saved.randMap = Array.from({ length: 11 }, (_, y) =>
    Array.from({ length: 15 }, (_, x) =>
      x === 0 || x === 14 || y === 0 || y === 10 ? 1 : 0,
    ),
  );
  expect(game.restore(saved)).toBe(true);
  return game;
}
function advance(game: ReturnType<typeof engine>, frames: number) {
  for (let i = 0; i < frames; i++) game.step({}, {}, 1000 / 60);
}
test('menu renders and selection persists; zero-time input does not advance simulation', () => {
  const game = engine();
  game.render();
  game.step({}, { MODE: true }, 0);
  const resumed = engine();
  expect(resumed.restore(game.snapshot())).toBe(true);
  expect(resumed.players).toBe(2);
  resumed.step({}, { START: true }, 0);
  resumed.step({}, { DROP: true }, 0);
  expect((resumed.snapshot() as SavedState).frames).toBe(0);
  expect((resumed.snapshot() as SavedState).bombs).toHaveLength(1);
});
test('bomb capacity, fuse and restored remaining time use the simulation clock', () => {
  const game = arena();
  game.step({}, { DROP: true }, 0);
  game.step({}, { DROP: true }, 0);
  advance(game, 60);
  const saved = game.snapshot() as SavedState;
  expect(saved.bombs).toHaveLength(1);
  expect(saved.newPlayer.bombs).toBe(0);
  expect(saved.bombs[0].remaining).toBeCloseTo(1300);
  const resumed = engine();
  expect(resumed.restore(saved)).toBe(true);
  // Rendering while paused consumes no fuse time.
  for (let i = 0; i < 200; i++) resumed.render();
  expect((resumed.snapshot() as SavedState).bombs[0].remaining).toBeCloseTo(
    1300,
  );
  advance(resumed, 80);
  const exploded = resumed.snapshot() as SavedState;
  expect(exploded.bombs).toHaveLength(0);
  expect(exploded.randMap[1][1]).toBe(4);
  expect(exploded.newPlayer.bombs).toBe(1);
  advance(resumed, 28);
  expect((resumed.snapshot() as SavedState).randMap[1][1]).toBe(0);
});
test('bricks and solid walls stop blast propagation', () => {
  const game = arena();
  const saved = game.snapshot() as SavedState;
  saved.newPlayer.bombPower = 3;
  saved.randMap[1][2] = 2;
  saved.randMap[2][1] = 1;
  expect(game.restore(saved)).toBe(true);
  game.step({}, { DROP: true }, 0);
  advance(game, 140);
  const result = game.snapshot() as SavedState;
  expect(result.randMap[1][2]).toBe(4);
  expect(result.randMap[1][3]).toBe(0);
  expect(result.randMap[2][1]).toBe(1);
  expect(result.randMap[3][1]).toBe(0);
});
test('movement stops at walls and all three pickups apply once', () => {
  const game = arena();
  const saved = game.snapshot() as SavedState;
  saved.randMap[1][2] = 1;
  saved.randMap[1][1] = 5;
  expect(game.restore(saved)).toBe(true);
  for (let i = 0; i < 40; i++) game.step({ RIGHT: true }, {}, 1000 / 60);
  const result = game.snapshot() as SavedState;
  expect(result.newPlayer.x).toBe(70);
  expect(result.newPlayer.bombPower).toBe(2);
  expect(result.randMap[1][1]).toBe(0);
  result.randMap[1][1] = 6;
  expect(game.restore(result)).toBe(true);
  game.step({}, {}, 1000 / 60);
  const faster = game.snapshot() as SavedState;
  expect(faster.newPlayer.speed).toBe(3);
  faster.randMap[1][1] = 7;
  expect(game.restore(faster)).toBe(true);
  game.step({}, {}, 1000 / 60);
  expect((game.snapshot() as SavedState).newPlayer.bombs).toBe(2);
});
test('multiplayer uses a separate player and awards victory to the survivor', () => {
  const game = arena(true);
  const saved = game.snapshot() as SavedState;
  saved.newPlayer.health = 1;
  saved.randMap[1][1] = 4;
  expect(game.restore(saved)).toBe(true);
  game.step({ P2_LEFT: true }, {}, 1000 / 60);
  expect(game.phase).toBe('over');
  expect(game.snapshot()).toBeNull();
  const drawn: string[] = [];
  const canvas = {
    width: 750,
    height: 600,
    getContext: () =>
      new Proxy(
        {},
        {
          get: (_, key) =>
            key === 'fillText'
              ? (value: string) => drawn.push(value)
              : () => {},
          set: () => true,
        },
      ),
  } as unknown as HTMLCanvasElement;
  const winner = createBomberman(
    canvas,
    {},
    (key, values) => `${key}:${values?.player ?? ''}`,
  );
  expect(winner.restore(saved)).toBe(true);
  winner.step({}, {}, 1000 / 60);
  winner.render();
  expect(drawn).toContain('winner:2');
});
test('corrupt snapshots are rejected without mutating the current session', () => {
  const game = arena();
  const before = game.snapshot();
  const malformed = structuredClone(before) as SavedState;
  malformed.newPlayer.x = -100;
  expect(game.restore(malformed)).toBe(false);
  malformed.newPlayer.x = 60;
  malformed.randMap[0][0] = 0;
  expect(game.restore(malformed)).toBe(false);
  expect(game.restore({ version: 1, randMap: [] })).toBe(false);
  expect(game.snapshot()).toEqual(before);
});

test('moving snapshots restore throughout the complete sprite animation', () => {
  const game = arena();
  for (let i = 0; i < 26; i++) {
    game.step({ RIGHT: true }, {}, 1000 / 60);
    const resumed = engine();
    expect(resumed.restore(game.snapshot())).toBe(true);
    resumed.step({}, {}, 1000 / 60);
    resumed.render();
  }
});
