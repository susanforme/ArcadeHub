import { describe, expect, test } from '@rstest/core';
import {
  advanceResolution,
  COLS,
  clearGroups,
  fallDelay,
  fits,
  gravityStep,
  isPuyoState,
  landingPair,
  lockPair,
  newPuyo,
  type Pair,
  type PuyoState,
  ROWS,
  rotatePair,
} from '../src/games/puyo-puyo/logic';

const at = (x: number, y: number) => y * COLS + x;
const empty = () => Array<number>(COLS * ROWS).fill(0);
const settling = (board: number[]): PuyoState => ({
  ...newPuyo(() => 0),
  board,
  pair: null,
  phase: 'settling',
});
function resolve(state: PuyoState) {
  let result = state;
  for (
    let step = 0;
    step < 100 && result.phase !== 'falling' && result.phase !== 'over';
    step++
  ) {
    result = advanceResolution(result, () => 0);
  }
  return result;
}

describe('puyo puyo', () => {
  test('rotates at a wall and floor without moving through occupied cells', () => {
    const board = empty();
    const left: Pair = { x: 0, y: 8, rotation: 0, colors: [1, 2] };
    const kicked = rotatePair(board, left, -1);
    expect(kicked.x).toBe(1);
    expect(kicked.rotation).toBe(3);
    expect(fits(board, kicked)).toBe(true);
    const floor = rotatePair(
      board,
      { ...left, x: 2, y: ROWS - 1, rotation: 1 },
      1,
    );
    expect(floor.y).toBe(ROWS - 2);
    expect(fits(board, floor)).toBe(true);
    const closed = Array<number>(COLS * ROWS).fill(3);
    const trapped = { ...left, x: 2 };
    closed[at(2, 8)] = 0;
    closed[at(2, 7)] = 0;
    expect(rotatePair(closed, trapped, 1)).toBe(trapped);
  });

  test('splits a horizontal pair onto uneven stacks without changing source boards', () => {
    const board = empty();
    board[at(1, 12)] = 3;
    board[at(1, 11)] = 4;
    const pair: Pair = { x: 1, y: 3, rotation: 1, colors: [1, 2] };
    const landed = landingPair(board, pair);
    expect(landed.y).toBe(10);
    const locked = lockPair({ ...newPuyo(() => 0), board, pair: landed });
    expect(board[at(1, 10)]).toBe(0);
    const step = gravityStep(locked.board);
    expect(step.moved).toBe(true);
    expect(locked.board[at(2, 10)]).toBe(2);
    expect(step.board[at(2, 11)]).toBe(2);
    const result = resolve(locked);
    expect(result.board[at(1, 10)]).toBe(1);
    expect(result.board[at(2, 12)]).toBe(2);
    expect(result.phase).toBe('falling');
  });

  test('clears four connected colors but excludes diagonals, row wraps and the hidden row', () => {
    const board = empty();
    for (let x = 0; x < 4; x++) board[at(x, 12)] = 1;
    expect(clearGroups(board)).toEqual([[72, 73, 74, 75]]);
    const diagonal = empty();
    for (let x = 0; x < 4; x++) diagonal[at(x, 12 - x)] = 1;
    expect(clearGroups(diagonal)).toEqual([]);
    const wrapped = empty();
    for (const [x, y] of [
      [5, 10],
      [0, 11],
      [1, 11],
      [2, 11],
    ])
      wrapped[at(x, y)] = 1;
    expect(clearGroups(wrapped)).toEqual([]);
    const hidden = empty();
    hidden.fill(1, 0, 4);
    expect(clearGroups(hidden)).toEqual([]);
  });

  test('resolves a two-step chain, applies its bonus and then awards all-clear', () => {
    const board = empty();
    for (let x = 0; x < 4; x++) board[at(x, 12)] = 1;
    for (const [x, y] of [
      [2, 11],
      [3, 11],
      [4, 12],
      [5, 12],
    ])
      board[at(x, y)] = 2;
    const result = resolve(settling(board));
    expect(result.phase).toBe('falling');
    expect(result.board.every((value) => value === 0)).toBe(true);
    expect(result.chain).toBe(2);
    expect(result.maxChain).toBe(2);
    expect(result.popped).toBe(8);
    expect(result.score).toBe(40 + 320 + 1000);
  });

  test('waits for resolution before judging a blocked entrance', () => {
    const blocked = empty();
    for (let y = 1; y < ROWS; y++) blocked[at(2, y)] = (y % 2) + 1;
    expect(resolve(settling(blocked)).phase).toBe('over');
    const saved = empty();
    for (let y = 1; y < ROWS; y++) saved[at(2, y)] = 1;
    const result = resolve(settling(saved));
    expect(result.phase).toBe('falling');
    expect(result.board.some(Boolean)).toBe(false);
  });

  test('restores a clearing phase without scoring its group a second time', () => {
    const board = empty();
    for (let x = 0; x < 4; x++) board[at(x, 12)] = 1;
    const flashing = advanceResolution(settling(board));
    expect(flashing.phase).toBe('clearing');
    expect(flashing.score).toBe(40);
    const restored = JSON.parse(JSON.stringify(flashing));
    expect(isPuyoState(restored)).toBe(true);
    const removed = advanceResolution(restored);
    expect(removed.score).toBe(40);
    expect(resolve(removed).score).toBe(1040);
  });

  test('validates stored pairs and phases and increases speed with a lower limit', () => {
    const state = newPuyo(() => 0.5);
    expect(isPuyoState(state)).toBe(true);
    for (const patch of [
      { version: 2 },
      { board: [1] },
      { score: Infinity },
      { phase: 'over' },
      { next: [0, 1] },
      { pair: { ...state.pair, rotation: 8 } },
      { phase: 'clearing', pair: null },
    ])
      expect(isPuyoState({ ...state, ...patch })).toBe(false);
    expect(fallDelay(12)).toBeLessThan(fallDelay(0));
    expect(fallDelay(10000)).toBe(110);
  });
});
