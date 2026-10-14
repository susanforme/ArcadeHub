import { describe, expect, test } from '@rstest/core';
import {
  COLS,
  findMove,
  findPath,
  isPetState,
  matchPets,
  newPetState,
  ROWS,
  shuffleBoard,
} from '../src/games/pet-connect/logic';

const empty = () => Array(COLS * ROWS).fill(0) as number[];
const at = (x: number, y: number) => y * COLS + x;
describe('pet connect', () => {
  test('connects straight and around one corner without mutating the board', () => {
    const board = empty();
    board[at(1, 1)] = 1;
    board[at(4, 1)] = 1;
    expect(findPath(board, at(1, 1), at(4, 1))).toHaveLength(2);
    board[at(4, 1)] = 0;
    board[at(4, 4)] = 1;
    expect(findPath(board, at(1, 1), at(4, 4))).toHaveLength(3);
    const state = { ...newPetState(), board };
    const result = matchPets(state, at(1, 1), at(4, 4));
    expect(result?.state.board.filter(Boolean)).toEqual([]);
    expect(result?.state.score).toBe(100);
    expect(board[at(1, 1)]).toBe(1);
  });
  test('uses the outside ring to bypass a blocked row in two turns', () => {
    const board = Array(COLS * ROWS).fill(2);
    board[0] = 1;
    board[COLS - 1] = 1;
    expect(findPath(board, 0, COLS - 1)).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: -1 },
      { x: COLS - 1, y: -1 },
      { x: COLS - 1, y: 0 },
    ]);
  });
  test('rejects enclosed pets, different pets, empty cells and invalid selections', () => {
    const board = Array(COLS * ROWS).fill(2);
    board[at(1, 2)] = 1;
    board[at(4, 5)] = 1;
    expect(findPath(board, at(1, 2), at(4, 5))).toBeNull();
    expect(findPath(board, at(1, 2), 0)).toBeNull();
    expect(findPath(board, 0, 0)).toBeNull();
    expect(findPath(board, -1, 0)).toBeNull();
    expect(findPath(board, 0.5, 1)).toBeNull();
    board[0] = 0;
    expect(findPath(board, 0, 1)).toBeNull();
  });
  test('does not allow a corridor requiring three turns', () => {
    const board = Array(COLS * ROWS).fill(2);
    const corridor = [
      [1, 2],
      [2, 2],
      [2, 3],
      [2, 4],
      [3, 4],
      [4, 4],
      [4, 5],
    ];
    for (const [x, y] of corridor) board[at(x, y)] = 0;
    board[at(1, 2)] = 1;
    board[at(4, 5)] = 1;
    expect(findPath(board, at(1, 2), at(4, 5))).toBeNull();
  });
  test('shuffling preserves holes and pets and guarantees a match even with unlucky randomness', () => {
    const board = empty();
    board[at(1, 1)] = 1;
    board[at(1, 2)] = 2;
    board[at(2, 1)] = 3;
    board[at(2, 2)] = 4;
    board[at(3, 3)] = 1;
    board[at(3, 4)] = 2;
    board[at(4, 3)] = 3;
    board[at(4, 4)] = 4;
    const result = shuffleBoard(board, () => 0.999999);
    expect([...result].sort()).toEqual([...board].sort());
    expect(result.map((tile) => Boolean(tile))).toEqual(
      board.map((tile) => Boolean(tile)),
    );
    expect(findMove(result)).not.toBeNull();
    expect(shuffleBoard(empty())).toEqual(empty());
  });
  test('repairs a deadlock when all thirty shuffles leave the board unchanged', () => {
    const board = [
      1, 8, 12, 5, 9, 11, 12, 1, 5, 7, 10, 3, 8, 4, 1, 6, 7, 8, 4, 11, 10, 3, 8,
      2, 10, 2, 12, 7, 11, 1, 9, 12, 9, 4, 3, 5, 6, 2, 10, 6, 7, 6, 3, 11, 5, 2,
      9, 4,
    ];
    expect(findMove(board)).toBeNull();
    const shuffled = shuffleBoard(board, () => 0.999999);
    expect(findMove(shuffled)).not.toBeNull();
    expect([...shuffled].sort()).toEqual([...board].sort());
  });
  test('can clear complete games while recovering deadlocks', () => {
    let seed = 71;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let game = 0; game < 20; game++) {
      let state = newPetState(random);
      expect(isPetState(state)).toBe(true);
      for (let pair = 0; pair < (COLS * ROWS) / 2; pair++) {
        if (!findMove(state.board))
          state.board = shuffleBoard(state.board, random);
        const move = findMove(state.board);
        expect(move).not.toBeNull();
        if (!move) throw new Error('Deadlock');
        const result = matchPets(state, ...move);
        if (!result) throw new Error('Invalid hint');
        expect(result.path.length).toBeLessThanOrEqual(4);
        state = result.state;
      }
      expect(state.board.every((tile) => tile === 0)).toBe(true);
      expect(state.score).toBe(2400);
    }
  });
  test('rejects corrupt and finished saves', () => {
    const state = newPetState();
    expect(isPetState(state)).toBe(true);
    for (const patch of [
      { version: 2 },
      { board: [1, 1] },
      { seconds: 0 },
      { seconds: Infinity },
      { score: -1 },
      { board: empty() },
    ])
      expect(isPetState({ ...state, ...patch })).toBe(false);
    const invalid = [...state.board];
    invalid[0] = 99;
    expect(isPetState({ ...state, board: invalid })).toBe(false);
    invalid[0] = 0;
    expect(isPetState({ ...state, board: invalid, score: 50 })).toBe(false);
  });
});
