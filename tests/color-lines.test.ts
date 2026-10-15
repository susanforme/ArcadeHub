import { describe, expect, test } from '@rstest/core';
import {
  findPath,
  isLinesState,
  type LinesState,
  matchingBalls,
  moveBall,
  newLines,
} from '../src/games/color-lines/logic';

function state(board = Array<number>(81).fill(0)): LinesState {
  return {
    version: 1,
    board,
    next: [2, 3, 4],
    score: 0,
    moves: 0,
    over: false,
  };
}

describe('Color Lines classic rules', () => {
  test('starts with five balls, seven colors and a saved three-ball preview', () => {
    const s = newLines(() => 0);
    expect(s.board.filter(Boolean)).toHaveLength(5);
    expect(s.next).toHaveLength(3);
    expect(matchingBalls(s.board)).toEqual([]);
    expect(isLinesState(JSON.parse(JSON.stringify(s)))).toBe(true);
  });

  test('finds an orthogonal detour around obstacles without crossing occupied cells', () => {
    const board = Array<number>(81).fill(0);
    board[0] = 1;
    board[1] = 2;
    board[10] = 3;
    const path = findPath(board, 0, 2);
    expect(path[0]).toBe(0);
    expect(path.at(-1)).toBe(2);
    expect(path.length).toBeGreaterThan(3);
    path.slice(1).forEach((cell, index) => {
      expect(board[cell]).toBe(0);
      const prior = path[index];
      expect(
        Math.abs((cell % 9) - (prior % 9)) +
          Math.abs(Math.floor(cell / 9) - Math.floor(prior / 9)),
      ).toBe(1);
    });
  });

  test('blocked moves and row-edge wrapping never spend a turn or generate balls', () => {
    const board = Array<number>(81).fill(2);
    board[9] = 0;
    const s = state(board);
    const result = moveBall(s, 8, 9, () => {
      throw new Error('A blocked move must not use RNG');
    });
    expect(result.state).toBe(s);
    expect(result.path).toEqual([]);
  });

  test('an ordinary move adds exactly the three previewed colors', () => {
    const board = Array<number>(81).fill(0);
    board[0] = 1;
    const s = state(board);
    const result = moveBall(s, 0, 8, () => 0);
    expect(result.state.board[8]).toBe(1);
    expect(result.spawned.map((index) => result.state.board[index])).toEqual([
      2, 3, 4,
    ]);
    expect(result.state.moves).toBe(1);
    expect(result.state.next).toEqual([1, 1, 1]);
    expect(s.board[0]).toBe(1);
  });

  test('five in a row clears and retains the preview without a computer turn', () => {
    const board = Array<number>(81).fill(0);
    [0, 1, 2, 3, 13].forEach((index) => {
      board[index] = 6;
    });
    const s = state(board);
    const result = moveBall(s, 13, 4, () => {
      throw new Error('A clear must not use RNG');
    });
    expect(result.cleared).toHaveLength(5);
    expect(result.state.score).toBe(10);
    expect(result.state.board.filter(Boolean)).toHaveLength(0);
    expect(result.state.next).toEqual(s.next);
    expect(result.spawned).toEqual([]);
  });

  test('horizontal and diagonal crossing lines remove their shared ball only once', () => {
    const board = Array<number>(81).fill(0);
    [38, 39, 41, 42, 20, 30, 50, 60, 31].forEach((index) => {
      board[index] = 4;
    });
    const result = moveBall(state(board), 31, 40);
    expect(result.cleared).toHaveLength(9);
    expect(result.state.score).toBe(18);
    expect(result.state.board.filter(Boolean)).toHaveLength(0);
    expect(result.spawned).toEqual([]);
  });

  test('both diagonals and long lines are recognized without row wrapping', () => {
    for (const line of [
      [0, 10, 20, 30, 40],
      [8, 16, 24, 32, 40],
      [2, 11, 20, 29, 38, 47],
    ]) {
      const board = Array<number>(81).fill(0);
      line.forEach((index) => {
        board[index] = 3;
      });
      expect(new Set(matchingBalls(board))).toEqual(new Set(line));
    }
    const board = Array<number>(81).fill(0);
    [7, 8, 9, 10, 11].forEach((index) => {
      board[index] = 3;
    });
    expect(matchingBalls(board)).toEqual([]);
  });

  test('a spawned ball can clear a line before the full-board loss is evaluated', () => {
    const board = Array.from(
      { length: 81 },
      (_, i) => (((i % 9) + 2 * Math.floor(i / 9)) % 7) + 1,
    );
    [72, 73, 74, 75].forEach((index) => {
      board[index] = 1;
    });
    board[0] = 2;
    board[1] = 0;
    board[76] = 0;
    board[77] = 2;
    const result = moveBall(
      { ...state(board), next: [1, 2, 3] },
      0,
      1,
      () => 0.999,
    );
    expect(result.cleared).toContain(76);
    expect(result.cleared).toHaveLength(5);
    expect(result.state.over).toBe(false);
  });

  test('fills only remaining spaces and stops on a full board', () => {
    const board = Array.from(
      { length: 81 },
      (_, i) => (((i % 9) + 2 * Math.floor(i / 9)) % 7) + 1,
    );
    board[40] = 0;
    const result = moveBall(state(board), 31, 40, () => 0);
    expect(result.spawned).toHaveLength(1);
    expect(result.state.over).toBe(true);
    expect(isLinesState(result.state)).toBe(true);
    expect(moveBall(result.state, 0, 1).state).toBe(result.state);
  });

  test('rejects truncated, impossible-color and inconsistent saved games', () => {
    const s = newLines();
    for (const bad of [
      null,
      {},
      { ...s, board: [1] },
      { ...s, next: [0, 2, 3] },
      { ...s, board: s.board.map(() => 8) },
      { ...s, score: Number.NaN },
      { ...s, moves: -1 },
      { ...s, over: true },
    ])
      expect(isLinesState(bad)).toBe(false);
  });
});
