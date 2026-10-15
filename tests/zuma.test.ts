import { describe, expect, test } from '@rstest/core';
import {
  BALL_SIZE,
  LEVEL_COUNT,
  lengthOf,
  mapFor,
  pointAt,
  TRACKS,
} from '../src/games/zuma/levels';
import {
  chooseColor,
  fire,
  insertBall,
  isZumaState,
  matchAt,
  newZuma,
  stepZuma,
  swapBalls,
  type ZumaEvent,
  type ZumaState,
} from '../src/games/zuma/logic';

function board(
  colors: number[],
  distances = colors.map((_, i) => 600 - i * BALL_SIZE),
): ZumaState {
  const s = newZuma(1, 0, 3, () => 0.1);
  s.phase = 'playing';
  s.remaining = 0;
  s.balls = colors.map((color, id) => ({ id, color, distance: distances[id] }));
  return s;
}

describe('Zuma', () => {
  test('loads three community tracks and creates valid rounds with increasing colors', () => {
    expect(TRACKS).toHaveLength(3);
    for (let level = 1; level <= LEVEL_COUNT; level++) {
      expect(lengthOf(level)).toBeGreaterThan(2000);
      expect(pointAt(level, -5)).toEqual(pointAt(level, 0));
      expect(pointAt(level, 1e6)).toEqual(pointAt(level, lengthOf(level)));
      expect(Number.isFinite(mapFor(level).frog.x)).toBe(true);
      const s = newZuma(level);
      expect(isZumaState(s)).toBe(true);
      expect(
        s.balls.every(
          (b) => b.color >= 0 && b.color < 4 + Math.floor((level - 1) / 3),
        ),
      ).toBe(true);
    }
    expect(pointAt(1, lengthOf(1)).x).toBeCloseTo(315.01, 1);
    expect(pointAt(2, lengthOf(2)).y).toBeCloseTo(306.01, 1);
  });

  test('inserts on both sides without overlap or changing existing order', () => {
    for (const before of [true, false]) {
      const s = board([0, 1, 2, 3]);
      insertBall(s, 1, before, 0, []);
      expect(s.balls.map((b) => b.id)).toEqual(
        before ? [0, 24, 1, 2, 3] : [0, 1, 24, 2, 3],
      );
      for (let i = 1; i < s.balls.length; i++)
        expect(s.balls[i - 1].distance - s.balls[i].distance).toBe(BALL_SIZE);
      expect(isZumaState(s)).toBe(true);
    }
  });

  test('matches connected groups of three but never across an open gap', () => {
    const s = board([0, 1, 1, 2]);
    const events: ZumaEvent[] = [];
    insertBall(s, 1, false, 1, events);
    expect(s.balls.map((b) => b.color)).toEqual([0, 2]);
    expect(s.score).toBe(30);
    expect(events.map((e) => e.type)).toEqual(['insert', 'pop']);
    const gap = board([1, 1, 1], [600, 570, 480]);
    expect(matchAt(gap, 0, [])).toBe(false);
    expect(gap.balls).toHaveLength(3);
  });

  test('pulls matching ends together and scores a delayed chain reaction', () => {
    const s = board([0, 1, 1, 0, 0]);
    const events: ZumaEvent[] = [];
    insertBall(s, 1, false, 1, events);
    expect(s.balls.map((b) => b.color)).toEqual([0, 0, 0]);
    expect(s.balls[0].distance - s.balls[1].distance).toBeGreaterThan(
      BALL_SIZE,
    );
    for (let i = 0; i < 120 && s.phase === 'playing'; i++)
      events.push(...stepZuma(s, 1 / 60));
    expect(
      events
        .filter((e) => e.type === 'pop')
        .map((e) => e.type === 'pop' && e.combo),
    ).toEqual([1, 2]);
    expect(s.phase).toBe('clear');
    expect(s.score).toBe(30 + 60 + 600);
  });

  test('lets a trailing segment catch a stopped front segment of another color', () => {
    const s = board([0, 1, 2], [600, 480, 450]);
    const head = s.balls[0].distance;
    for (let i = 0; i < 100; i++) stepZuma(s, 0.05);
    expect(s.balls[0].distance).toBeCloseTo(head, 4);
    expect(s.balls[0].distance - s.balls[1].distance).toBeLessThan(120);
    expect(s.balls).toHaveLength(3);
  });

  test('fast projectiles hit a track segment and get consumed exactly once', () => {
    const s = board([0, 1, 2]);
    const p = pointAt(1, s.balls[1].distance);
    s.shot = { x: p.x - 60, y: p.y, vx: 760, vy: 0, color: 3 };
    const events = stepZuma(s, 0.1);
    expect(events.filter((e) => e.type === 'insert')).toHaveLength(1);
    expect(s.shot).toBeNull();
    expect(s.balls).toHaveLength(4);
    expect(isZumaState(s)).toBe(true);
  });

  test('fires in the aimed direction, swaps colors and blocks repeated shots', () => {
    const s = board([1, 2]);
    s.angle = Math.PI;
    s.current = 1;
    s.next = 2;
    swapBalls(s);
    expect(s.current).toBe(2);
    expect(fire(s, () => 0)).toBe(true);
    expect(s.shot?.vx).toBeCloseTo(-760);
    expect(s.shot?.color).toBe(2);
    expect(fire(s)).toBe(false);
    s.phase = 'ready';
    const old = s.current;
    swapBalls(s);
    expect(s.current).toBe(old);
    expect(fire(s)).toBe(false);
    expect(chooseColor(board([2, 2]), () => 0.99)).toBe(2);
  });

  test('generates a finite queue and removes unavailable shooter colors when it ends', () => {
    const s = board([1], [300]);
    s.remaining = 1;
    stepZuma(s, 0.05, () => 0);
    expect(s.remaining).toBe(0);
    expect(s.balls).toHaveLength(2);
    s.balls = [s.balls[0]];
    s.current = 3;
    s.next = 2;
    stepZuma(s, 0.05);
    expect(s.current).toBe(1);
    expect(s.next).toBe(1);
  });

  test('loses one life at the skull and keeps a valid retry snapshot', () => {
    const s = board([0], [lengthOf(1) - 0.01]);
    expect(stepZuma(s, 0.05).map((e) => e.type)).toEqual(['lost']);
    expect(s.lives).toBe(2);
    expect(s.phase).toBe('lost');
    expect(isZumaState(s)).toBe(true);
    const snapshot = JSON.stringify(s);
    expect(stepZuma(s, 0.1)).toEqual([]);
    expect(JSON.stringify(s)).toBe(snapshot);
    s.phase = 'playing';
    s.lives = 1;
    stepZuma(s, 0.05);
    expect(s.phase).toBe('over');
    expect(isZumaState(s)).toBe(false);
  });

  test('clears only after the chain and queue empty and wins the final round', () => {
    const s = board([]);
    s.level = LEVEL_COUNT;
    expect(stepZuma(s, 0.05).map((e) => e.type)).toEqual(['clear']);
    expect(s.phase).toBe('won');
    expect(s.score).toBe(1400);
    expect(isZumaState(s)).toBe(false);
    const waiting = board([]);
    waiting.remaining = 1;
    stepZuma(waiting, 0.05);
    expect(waiting.phase).toBe('playing');
  });

  test('round-trips live shots and rejects corrupt, unordered and duplicate saves', () => {
    const s = board([0, 1, 2]);
    fire(s);
    expect(isZumaState(JSON.parse(JSON.stringify(s)))).toBe(true);
    for (const patch of [
      { version: 2 },
      { level: 0 },
      { level: 10 },
      { lives: 0 },
      { score: -1 },
      { remaining: Infinity },
      { angle: NaN },
      { current: 99 },
      { cooldown: -1 },
      { phase: 'won' },
      { shot: {} },
      { balls: null },
      { balls: [...s.balls, s.balls[0]] },
      { balls: [...s.balls].reverse() },
      { balls: [{ ...s.balls[0], distance: NaN }] },
    ])
      expect(isZumaState({ ...s, ...patch })).toBe(false);
  });
});
