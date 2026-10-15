import { describe, expect, test } from '@rstest/core';
import { createRegistry, games } from '../src/core/game-registry';
import {
  foodFor,
  isSnakeState,
  newSnake,
  stepSnake,
} from '../src/games/snake/logic';
import {
  COLS,
  fits,
  isTetrisState,
  lockPiece,
  newTetris,
  ROWS,
  rotate,
} from '../src/games/tetris/logic';

describe('game discovery', () => {
  test('discovers manifests without a manually maintained list', () => {
    expect(games.map((game) => game.id)).toEqual(
      expect.arrayContaining([
        '2048',
        'doodle-jump',
        'flappy-bird',
        'pacman',
        'snake',
        'tetris',
        't-rex-runner',
      ]),
    );
  });
  test('rejects duplicate ids', () => {
    expect(() => createRegistry([games[0], games[0]])).toThrow('duplicate');
  });
});
describe('snake', () => {
  test('eating grows the snake and increases score', () => {
    const state = newSnake();
    state.food = { x: 9, y: 10 };
    const result = stepSnake(state, { x: 1, y: 0 });
    expect(result.ate).toBe(true);
    expect(result.state.body).toHaveLength(4);
    expect(result.state.score).toBe(10);
    expect(result.over).toBe(false);
  });
  test('ignores a reverse turn', () => {
    const result = stepSnake(newSnake(), { x: -1, y: 0 });
    expect(result.state.body[0]).toEqual({ x: 9, y: 10 });
  });
  test('wall and self collisions end the game', () => {
    const state = newSnake();
    state.body[0] = { x: 19, y: 10 };
    expect(stepSnake(state, { x: 1, y: 0 }).over).toBe(true);
    state.body = [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ];
    expect(stepSnake(state, { x: 1, y: 0 }).over).toBe(true);
  });
  test('can move into the departing tail', () => {
    const state = newSnake();
    state.body = [
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 1 },
    ];
    state.food = { x: 9, y: 9 };
    expect(stepSnake(state, { x: 1, y: 0 }).over).toBe(false);
  });
  test('food stays off the snake and a full board has no food', () => {
    const full = Array.from({ length: 400 }, (_, i) => ({
      x: i % 20,
      y: Math.floor(i / 20),
    }));
    expect(foodFor(full)).toBeNull();
    expect(foodFor(full.slice(1), () => 0)).toEqual({ x: 0, y: 0 });
  });
  test('corrupt snapshots are rejected', () => {
    expect(isSnakeState(newSnake())).toBe(true);
    expect(isSnakeState({ body: [] })).toBe(false);
    expect(isSnakeState({ ...newSnake(), direction: { x: 1, y: 0.5 } })).toBe(
      false,
    );
  });
});
describe('tetris', () => {
  test('prevents motion through the floor and walls', () => {
    const state = newTetris();
    expect(fits(state.board, { cells: [[1]], x: -1, y: 0 })).toBe(false);
    expect(fits(state.board, { cells: [[1]], x: 0, y: 20 })).toBe(false);
  });
  test('rotation kicks the piece away from the right wall', () => {
    const state = newTetris();
    const piece = { cells: [[1], [1], [1], [1]], x: 9, y: 2 };
    const rotated = rotate(state.board, piece);
    expect(fits(state.board, rotated)).toBe(true);
    expect(rotated.cells).toEqual([[1, 1, 1, 1]]);
    expect(rotated.x).toBe(6);
    const t = rotate(state.board, {
      cells: [
        [3, 0],
        [3, 3],
        [3, 0],
      ],
      x: 8,
      y: 2,
    });
    expect(t.cells).toHaveLength(2);
    expect(t.x).toBe(7);
  });
  test('clears a completed row, advances the next piece, and awards points', () => {
    const state = newTetris();
    state.board[ROWS - 1] = Array(COLS).fill(2);
    state.board[ROWS - 1][0] = 0;
    state.piece = { cells: [[1]], x: 0, y: ROWS - 1 };
    const result = lockPiece(state);
    expect(result.cleared).toBe(1);
    expect(result.state.score).toBe(100);
    expect(result.state.lines).toBe(1);
    expect(result.state.board[0]).toEqual(Array(COLS).fill(0));
    expect(result.state.piece.cells).toEqual(state.next);
    expect(result.over).toBe(false);
  });
  test('four lines score 800 and an obstructed spawn ends the game', () => {
    const state = newTetris();
    for (let y = 16; y < 20; y++) state.board[y] = [0, ...Array(9).fill(2)];
    state.piece = { cells: [[1], [1], [1], [1]], x: 0, y: 16 };
    expect(lockPiece(state).state.score).toBe(800);
    const blocked = newTetris();
    blocked.next = [
      [2, 2],
      [2, 2],
    ];
    blocked.board[0][4] = 1;
    blocked.piece = { cells: [[1]], x: 0, y: 19 };
    expect(lockPiece(blocked).over).toBe(true);
  });
  test('corrupt snapshots are rejected', () => {
    expect(isTetrisState(newTetris())).toBe(true);
    expect(isTetrisState({ board: [[]] })).toBe(false);
    expect(
      isTetrisState({ ...newTetris(), piece: { cells: [[99]], x: 0, y: 0 } }),
    ).toBe(false);
  });
});
