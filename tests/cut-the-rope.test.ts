import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import { LEVELS, type Level } from '../src/games/cut-the-rope/levels';
import {
  type MatterAPI,
  RopeWorld,
  readProgress,
  recordWin,
  segmentsTouch,
  totalScore,
} from '../src/games/cut-the-rope/physics';

// Exercise the exact engine bundled by the installed Phaser, without DOM rendering.
const require = createRequire(import.meta.url);
const Matter: MatterAPI = require(
  join(
    dirname(require.resolve('phaser/package.json')),
    'src/physics/matter-js/CustomMain.js',
  ),
);
const dt = 1000 / 120;
function advance(w: RopeWorld, ticks: number) {
  for (let i = 0; i < ticks; i++) w.step(dt);
}
const routes: { cuts: [number, number][]; pop?: number; blow?: number }[] = [
  { cuts: [[0, 0]] },
  {
    cuts: [
      [0, 0],
      [42, 1],
    ],
  },
  {
    cuts: [
      [0, 1],
      [42, 0],
    ],
  },
  { cuts: [[174, 0]] },
  { cuts: [[0, 0]], pop: 148 },
  {
    cuts: [
      [0, 0],
      [0, 1],
    ],
    pop: 142,
  },
  { cuts: [[0, 0]], blow: 0 },
  { cuts: [[0, 0]], blow: 0 },
  { cuts: [[168, 0]] },
  { cuts: [[0, 0]], pop: 130, blow: 104 },
  { cuts: [[0, 0]], pop: 130, blow: 104 },
  {
    cuts: [
      [0, 0],
      [0, 1],
    ],
    pop: 134,
    blow: 176,
  },
];
describe('Cut the Rope', () => {
  test('discovered as a pointer game without a virtual pad', () => {
    const game = games.find((g) => g.id === 'cut-the-rope');
    expect(game?.category).toBe('categories.puzzle');
    expect(game?.virtualGamepad).toBeUndefined();
  });
  test.each(LEVELS.map((level, index) => ({ level, index })))(
    'level $index has a three-star solution',
    ({ level, index }) => {
      const w = new RopeWorld(level, Matter),
        route = routes[index];
      for (let tick = 0; tick < 900 && w.phase === 'playing'; tick++) {
        for (const [time, rope] of route.cuts)
          if (time === tick) w.cutRope(rope);
        if (tick === route.pop) w.popBubble();
        if (tick === route.blow) w.blow(0);
        w.step(dt);
      }
      expect(w.phase).toBe('won');
      expect(w.collected).toEqual([true, true, true]);
      w.destroy();
    },
  );
  test('uncut rope holds candy; cutting keeps velocity and permits free fall', () => {
    const w = new RopeWorld(LEVELS[0], Matter);
    advance(w, 360);
    expect(w.candy.position.y).toBeLessThan(260);
    expect(w.phase).toBe('playing');
    Matter.Body.setVelocity(w.candy, { x: 2, y: 3 });
    expect(w.cutRope(0)).toBe(true);
    expect(w.candy.velocity).toEqual({ x: 2, y: 3 });
    expect(w.cutRope(0)).toBe(false);
    w.step(dt);
    expect(w.candy.position.x).toBeGreaterThan(300);
    expect(w.candy.position.y).toBeGreaterThan(250);
    w.destroy();
  });
  test('fixed stepping produces the same result at 30 and 120 FPS', () => {
    const a = new RopeWorld(LEVELS[3], Matter),
      b = new RopeWorld(LEVELS[3], Matter);
    for (let i = 0; i < 30; i++) a.step(1000 / 30);
    advance(b, 120);
    expect(a.candy.position.x).toBeCloseTo(b.candy.position.x, 8);
    expect(a.candy.position.y).toBeCloseTo(b.candy.position.y, 8);
    a.destroy();
    b.destroy();
  });
  test('short/fast swipes and taps cut only ropes they touch', () => {
    expect(
      segmentsTouch(
        { x: 0, y: 1 },
        { x: 10, y: 1 },
        { x: 5, y: -10 },
        { x: 5, y: 10 },
      ),
    ).toBe(true);
    expect(
      segmentsTouch(
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 50, y: -10 },
        { x: 50, y: 10 },
      ),
    ).toBe(false);
    const w = new RopeWorld(LEVELS[0], Matter);
    expect(w.swipe({ x: 270, y: 200 }, { x: 330, y: 200 })).toEqual([0]);
    expect(w.swipe({ x: 270, y: 200 }, { x: 330, y: 200 })).toEqual([]);
    w.destroy();
  });
  test('bubble reverses gravity, popping restores fall and it cannot be reused', () => {
    const w = new RopeWorld(LEVELS[4], Matter);
    w.cutRope(0);
    advance(w, 45);
    expect(w.bubble).toBe(true);
    advance(w, 80);
    expect(w.candy.velocity.y).toBeLessThan(0);
    expect(w.popBubble()).toBe(true);
    expect(w.popBubble()).toBe(false);
    advance(w, 130);
    expect(w.candy.velocity.y).toBeGreaterThan(0);
    expect(w.usedBubbles.size).toBe(1);
    expect(w.bubble).toBe(false);
    w.destroy();
  });
  test('spikes and escaped candy fail; a lost world stops advancing', () => {
    const level: Level = {
      ...LEVELS[0],
      spikes: [{ x: 300, y: 420, width: 120 }],
    };
    const w = new RopeWorld(level, Matter);
    w.cutRope(0);
    advance(w, 150);
    expect(w.phase).toBe('lost');
    expect(w.reason).toBe('spikes');
    const pos = { ...w.candy.position };
    advance(w, 120);
    expect(w.candy.position).toEqual(pos);
    w.destroy();
    const out = new RopeWorld(
      { ...LEVELS[0], monster: { x: 100, y: 610 } },
      Matter,
    );
    out.cutRope(0);
    advance(out, 180);
    expect(out.phase).toBe('lost');
    expect(out.reason).toBe('out');
    out.destroy();
  });
  test('progress keeps best stars without farming score and validates saves', () => {
    const p = readProgress(null, 12);
    recordWin(p, 2);
    const score = totalScore(p);
    recordWin(p, 1);
    expect(p.best[0]).toBe(2);
    expect(p.unlocked).toBe(1);
    expect(totalScore(p)).toBe(score);
    recordWin(p, 3);
    expect(totalScore(p)).toBe(400);
    const restored = readProgress(p, 12);
    expect(restored).toEqual(p);
    restored.best[0] = 0;
    expect(p.best[0]).toBe(3);
    expect(readProgress({ ...p, level: 99 }, 12).level).toBe(0);
    expect(readProgress({ ...p, best: Array(12).fill(4) }, 12).best[0]).toBe(
      -1,
    );
    expect(readProgress({ ...p, level: 4, unlocked: 1 }, 12).level).toBe(0);
  });
});
