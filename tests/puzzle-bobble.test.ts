import { describe, expect, test } from '@rstest/core';
import { LEVELS } from '../src/games/puzzle-bobble/levels';
import {
  advanceShot,
  aimPath,
  COLS,
  connected,
  fire,
  isBubbleState,
  LAUNCHER,
  LEFT,
  MAX_ANGLE,
  neighbors,
  newBubbleState,
  PRESSURE_SHOTS,
  position,
  RADIUS,
  RIGHT,
  settle,
  stepBubble,
  swap,
} from '../src/games/puzzle-bobble/logic';

const empty = () => Array<number>(96).fill(0);
const shot = (color = 1) => ({ ...LAUNCHER, vx: 0, vy: -760, color });

describe('Puzzle Bobble', () => {
  test('every campaign layout has valid cells, anchored clusters and a resumable state', () => {
    expect(LEVELS).toHaveLength(12);
    LEVELS.forEach((_, i) => {
      const state = newBubbleState(i + 1, 0, () => 0);
      expect(isBubbleState(state)).toBe(true);
      expect(connected(state.board, [0, 1, 2, 3, 4, 5, 6, 7]).size).toBe(
        state.board.filter(Boolean).length,
      );
      state.angle = MAX_ANGLE;
      fire(state);
      expect(isBubbleState(state)).toBe(true);
    });
  });
  test('hex neighbors are symmetric and do not wrap at row boundaries', () => {
    expect(neighbors(0)).toEqual([1, 8]);
    expect(neighbors(8)).toEqual([9, 0, 1, 16, 17]);
    expect(neighbors(7)).not.toContain(8);
    for (let i = 0; i < 96; i++) {
      if (Math.floor(i / COLS) % 2 && i % COLS === 7) continue;
      for (const n of neighbors(i)) {
        expect(neighbors(n)).toContain(i);
        expect(
          Math.hypot(
            position(n).x - position(i).x,
            position(n).y - position(i).y,
          ),
        ).toBeLessThan(49);
      }
    }
  });
  test('matches across staggered rows, drops disconnected chains and keeps ceiling anchors', () => {
    const state = newBubbleState();
    state.board = empty();
    state.board[0] = state.board[8] = 1;
    state.board[16] = state.board[24] = 2;
    state.board[7] = 3;
    state.shot = shot();
    const bursts = settle(state, 1, () => 0);
    expect(
      bursts
        .filter((b) => !b.falling)
        .map((b) => b.index)
        .sort((a, b) => a - b),
    ).toEqual([0, 1, 8]);
    expect(bursts.filter((b) => b.falling).map((b) => b.index)).toEqual([
      16, 24,
    ]);
    expect(state.board[7]).toBe(3);
    expect(state.score).toBe(70);
    expect(state.current).toBe(3);
    expect(state.next).toBe(3);
    expect(isBubbleState(state)).toBe(true);
  });
  test('a pair stays on the board and only a three-way match wins', () => {
    const state = newBubbleState();
    state.board = empty();
    state.board[0] = 1;
    state.shot = shot();
    expect(settle(state, 1)).toEqual([]);
    expect(state.board.filter(Boolean)).toEqual([1, 1]);
    state.shot = shot();
    settle(state, 8);
    expect(state.phase).toBe('clear');
    expect(state.score).toBe(1030);
    expect(isBubbleState(state)).toBe(true);
    const last = {
      ...state,
      level: LEVELS.length,
      board: empty(),
      phase: 'playing' as const,
      shot: shot(),
    };
    last.board[0] = last.board[1] = 1;
    settle(last, 8);
    expect(last.phase).toBe('won');
    expect(isBubbleState(last)).toBe(false);
  });
  test('shot collision is frame-rate independent, bounces off a wall and snaps into an adjacent free cell', () => {
    const state = newBubbleState();
    const fly = (dt: number) => {
      const p = {
        ...shot(),
        vx: Math.sin(MAX_ANGLE) * 760,
        vy: -Math.cos(MAX_ANGLE) * 760,
      };
      let hit: number | null = null;
      for (let i = 0; i < 2000 && hit === null; i++) {
        hit = advanceShot(p, state.board, 0, dt);
        expect(p.x).toBeGreaterThanOrEqual(LEFT + RADIUS);
        expect(p.x).toBeLessThanOrEqual(RIGHT - RADIUS);
      }
      expect(hit).not.toBeNull();
      expect(hit).toBeGreaterThanOrEqual(0);
      expect(state.board[hit as number]).toBe(0);
      return hit;
    };
    expect(fly(1 / 144)).toBe(fly(0.1));
    const path = aimPath({ ...state, angle: MAX_ANGLE });
    expect(path.some((p, i) => i > 0 && p.x < path[i - 1].x)).toBe(true);
    expect(path.length).toBeLessThan(101);
    fire(state);
    for (let i = 0; i < 300 && state.shot; i++) stepBubble(state, 1 / 60);
    expect(state.shot).toBeNull();
    expect(state.shots).toBe(1);
  });
  test('ceiling descends every eight shots and bubbles on the danger line lose', () => {
    const state = newBubbleState();
    state.board = empty();
    state.board[0] = 1;
    state.shots = PRESSURE_SHOTS - 1;
    state.shot = shot(2);
    settle(state, 1);
    expect(state.ceiling).toBe(1);
    expect(state.phase).toBe('playing');
    state.ceiling = 9;
    state.shots = 79;
    state.shot = shot(3);
    settle(state, 8);
    expect(state.phase).toBe('over');
  });
  test('swapping and firing are gated while a bubble is in flight', () => {
    const state = newBubbleState();
    state.current = 1;
    state.next = 3;
    swap(state);
    expect([state.current, state.next]).toEqual([3, 1]);
    expect(fire(state)).toBe(true);
    expect(fire(state)).toBe(false);
    swap(state);
    expect([state.current, state.next]).toEqual([3, 1]);
    const restored = JSON.parse(JSON.stringify(state));
    expect(isBubbleState(restored)).toBe(true);
    expect(aimPath(restored)).toEqual(aimPath(state));
  });
  test('can clear the first arcade layout through bank shots, swaps and a resumable eighth-shot clear', () => {
    const state = newBubbleState(1, 0, () => 0);
    const moves = [
      [-1.1386666666666667, 0],
      [-0.7726666666666666, 1],
      [-0.8133333333333334, 0],
      [-1.22, 1],
      [-0.44733333333333336, 1],
      [-0.488, 0],
      [-1.22, 0],
      [-1.1386666666666667, 1],
    ];
    moves.forEach(([angle, exchange], turn) => {
      if (exchange) swap(state);
      state.angle = angle;
      fire(state);
      for (let frame = 0; frame < 300 && state.shot; frame++)
        stepBubble(state, 1 / 60, () => ((turn + 1) * 0.61803398875) % 1);
    });
    expect(state.phase).toBe('clear');
    expect(state.shots).toBe(8);
    expect(state.board.some(Boolean)).toBe(false);
    expect(isBubbleState(JSON.parse(JSON.stringify(state)))).toBe(true);
    const next = newBubbleState(state.level + 1, state.score);
    expect(isBubbleState(next)).toBe(true);
    expect(next.score).toBe(state.score);
    expect(next.ceiling).toBe(0);
  });
  test('rejects corrupt saves, disconnected clusters and invalid flight data', () => {
    const state = newBubbleState();
    for (const patch of [
      { version: 2 },
      { level: 0 },
      { level: 13 },
      { score: -1 },
      { angle: NaN },
      { shots: 8 },
      { ceiling: -1 },
      { current: 9 },
      { phase: 'over' },
      { board: [] },
      { board: empty() },
      { shot: {} },
      { shot: { ...shot(), vy: 760 } },
      { shot: { ...shot(), x: 0 } },
    ])
      expect(isBubbleState({ ...state, ...patch })).toBe(false);
    const board = [...state.board];
    board[15] = 1;
    expect(isBubbleState({ ...state, board })).toBe(false);
    const detached = [...state.board];
    detached[8 * 8] = 1;
    expect(isBubbleState({ ...state, board: detached })).toBe(false);
  });
});
