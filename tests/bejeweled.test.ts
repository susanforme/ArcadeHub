import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  adjacent,
  clearMatches,
  colorOf,
  CUBE,
  findMatches,
  findMove,
  isJewelState,
  levelFor,
  levelGoal,
  newBoard,
  refill,
  SIZE,
  swapGems,
} from '../src/games/bejeweled/logic';

const empty = () => Array(SIZE * SIZE).fill(0) as number[];
// Every row/column has distinct neighbors; this full board has no valid swaps.
const deadlock = () =>
  Array.from(
    { length: SIZE * SIZE },
    (_, i) => (((i % SIZE) + 2 * Math.floor(i / SIZE)) % 7) + 1,
  );
const opening = () => {
  const board = deadlock();
  [board[0], board[1], board[2], board[9]] = [1, 2, 1, 1];
  return board;
};

describe('classic bejeweled', () => {
  test('is discovered as a lazy Phaser puzzle plugin', () => {
    const game = games.find((entry) => entry.id === 'bejeweled');
    expect(game?.category).toBe('categories.puzzle');
    expect(typeof game?.load).toBe('function');
  });
  test('generates settled playable boards even with constant random sources', () => {
    for (const value of [0, 0.5, 0.999999]) {
      const board = newBoard(() => value);
      expect(board).toHaveLength(64);
      expect(findMatches(board)).toEqual([]);
      expect(findMove(board)).not.toBeNull();
      expect(isJewelState({ version: 1, board, score: 0, moves: 0 })).toBe(
        true,
      );
    }
  });
  test('rejects invalid swaps and does not wrap between rows or mutate input', () => {
    const board = opening();
    const before = [...board];
    expect(adjacent(7, 8)).toBe(false);
    for (const [a, b] of [
      [7, 8],
      [-1, 0],
      [0, 0],
      [0.5, 1],
      [0, 9],
      [0, 1],
    ])
      expect(swapGems(board, a, b)).toBeNull();
    const result = swapGems(board, 1, 9);
    expect(result?.clear.removed.sort((a, b) => a - b)).toEqual([0, 1, 2]);
    expect(result?.clear.created).toEqual([]);
    expect(board).toEqual(before);
  });
  test('creates one flame for four and one hypercube for five at the moved gem', () => {
    const four = empty();
    for (const index of [16, 17, 18, 19]) four[index] = 2;
    const flame = clearMatches(four, [18]);
    expect(flame?.created).toEqual([18]);
    expect(flame?.board[18]).toBe(9);
    expect(flame?.removed).toHaveLength(3);
    const five = [...four];
    five[20] = 2;
    const cube = clearMatches(five, [20]);
    expect(cube?.created).toEqual([20]);
    expect(cube?.board[20]).toBe(CUBE);
    expect(cube?.removed).toHaveLength(4);
  });
  test('merges a crossing match into one flame without counting the center twice', () => {
    const board = empty();
    for (const index of [18, 19, 20, 11, 27]) board[index] = 4;
    const result = clearMatches(board, [19]);
    expect(result?.created).toEqual([19]);
    expect(result?.board[19]).toBe(11);
    expect(result?.removed).toHaveLength(4);
    expect(new Set(result?.removed).size).toBe(4);
  });
  test('propagates neighboring flame explosions and respects board edges', () => {
    const board = empty();
    board[19] = board[35] = 1;
    board[27] = 8;
    board[28] = 9;
    board[21] = 3;
    const result = clearMatches(board);
    expect(result?.removed).toContain(28);
    expect(result?.removed).toContain(21);
    expect(result?.board[21]).toBe(0);
    const edge = empty();
    edge[0] = 8;
    edge[1] = edge[2] = 1;
    edge[7] = 6;
    edge[15] = 3;
    const blast = clearMatches(edge);
    expect(blast?.board[7]).toBe(6);
    expect(blast?.board[15]).toBe(3);
  });
  test('a cube targets the swapped color; swapping two cubes clears all gems', () => {
    const board = deadlock();
    board[0] = CUBE;
    const targets = board.flatMap((gem, index) =>
      colorOf(gem) === 2 ? [index] : [],
    );
    const result = swapGems(board, 0, 1);
    if (!result) throw new Error('A hypercube must allow an adjacent swap');
    expect([...result.clear.removed].sort((a, b) => a - b)).toEqual([
      0,
      ...targets,
    ]);
    expect(result?.clear.created).toEqual([]);
    board[1] = CUBE;
    expect(swapGems(board, 0, 1)?.clear.removed).toHaveLength(64);
    expect(swapGems(board, 0, 1)?.clear.board.every((gem) => gem === 0)).toBe(
      true,
    );
  });
  test('gravity preserves survivor order, special types and animation origins', () => {
    const board = empty();
    board[0] = 2;
    board[24] = 8;
    board[56] = CUBE;
    const filled = refill(board, () => 0.5);
    expect([filled.board[40], filled.board[48], filled.board[56]]).toEqual([
      2,
      8,
      CUBE,
    ]);
    expect([filled.from[40], filled.from[48], filled.from[56]]).toEqual([
      0, 24, 56,
    ]);
    expect(filled.from[0]).toBe(-1);
    expect(filled.board[0]).toBe(4);
    expect(board[0]).toBe(2);
  });
  test('detects no-move boards and quadratic level milestones', () => {
    expect(findMatches(deadlock())).toEqual([]);
    expect(findMove(deadlock())).toBeNull();
    expect(findMove(opening())).not.toBeNull();
    expect([0, 999, 1000, 3999, 4000].map(levelFor)).toEqual([1, 1, 2, 2, 3]);
    expect([1, 2, 3].map(levelGoal)).toEqual([1000, 4000, 9000]);
  });
  test('rejects corrupt, incomplete and unresolved saves', () => {
    const state = { version: 1, board: opening(), score: 100, moves: 3 };
    expect(isJewelState(state)).toBe(true);
    const unresolved = opening();
    unresolved[1] = 1;
    for (const patch of [
      { version: 2 },
      { board: [1, 2, 3] },
      { score: -1 },
      { score: Infinity },
      { moves: 1.5 },
      { board: [0, ...state.board.slice(1)] },
      { board: [16, ...state.board.slice(1)] },
      { board: unresolved },
    ])
      expect(isJewelState({ ...state, ...patch })).toBe(false);
    expect(isJewelState(null)).toBe(false);
  });
});
