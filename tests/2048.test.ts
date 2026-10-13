import { describe, expect, test } from '@rstest/core';
import {
  continueGrid,
  type GridState,
  isGridState,
  moveGrid,
  movesAvailable,
  newGrid,
  spawnTile,
} from '../src/games/2048/logic';

function state(row: number[], others: number[] = Array(12).fill(0)): GridState {
  return {
    version: 1,
    board: [...row, ...others],
    score: 0,
    won: false,
    keepPlaying: false,
    over: false,
  };
}
function lastEmpty() {
  let first = true;
  return () => {
    if (first) {
      first = false;
      return 0;
    }
    return 0.999;
  };
}
describe('2048', () => {
  test('starts with two tiles and generates 2/4 at the original threshold', () => {
    const initial = newGrid(() => 0);
    expect(initial.board.filter(Boolean)).toEqual([2, 2]);
    expect(
      spawnTile(Array(16).fill(0), () => 0.899).board.filter(Boolean),
    ).toEqual([2]);
    expect(
      spawnTile(Array(16).fill(0), () => 0.9).board.filter(Boolean),
    ).toEqual([4]);
  });
  test('each tile merges at most once per move', () => {
    const input = state([2, 2, 2, 2]);
    const result = moveGrid(input, 'LEFT', lastEmpty());
    expect(result.state.board.slice(0, 4)).toEqual([4, 4, 0, 0]);
    expect(result.state.score).toBe(8);
    expect(input.board.slice(0, 4)).toEqual([2, 2, 2, 2]);
    expect(
      moveGrid(state([2, 2, 4, 0]), 'LEFT', lastEmpty()).state.board.slice(
        0,
        4,
      ),
    ).toEqual([4, 4, 0, 0]);
  });
  test('compacts empty cells before merging', () => {
    const result = moveGrid(state([2, 0, 2, 2]), 'LEFT', lastEmpty());
    expect(result.state.board.slice(0, 4)).toEqual([4, 2, 0, 0]);
    expect(result.merged).toEqual([0]);
    expect(result.spawned).toBe(15);
  });
  test('right/down/up traverse from the movement edge', () => {
    expect(
      moveGrid(state([2, 2, 4, 0]), 'RIGHT', lastEmpty()).state.board.slice(
        0,
        4,
      ),
    ).toEqual([0, 0, 4, 4]);
    const input = state([2, 8, 0, 0]);
    input.board[4] = 2;
    const up = moveGrid(input, 'UP', lastEmpty());
    expect(up.state.board[0]).toBe(4);
    const down = moveGrid(input, 'DOWN', lastEmpty());
    expect(down.state.board[12]).toBe(4);
    expect(down.state.board[13]).toBe(8);
  });
  test('a no-op does not spawn, score, or call RNG', () => {
    const input = state([2, 4, 0, 0]);
    let calls = 0;
    const result = moveGrid(input, 'LEFT', () => {
      calls++;
      return 0;
    });
    expect(result.moved).toBe(false);
    expect(result.state).toBe(input);
    expect(calls).toBe(0);
  });
  test('only a full board without an adjacent match is stuck', () => {
    const checker = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2];
    expect(movesAvailable(checker)).toBe(false);
    checker[0] = 0;
    expect(movesAvailable(checker)).toBe(true);
    checker[0] = 4;
    expect(movesAvailable(checker)).toBe(true);
  });
  test('last spawn can end the game after a valid move', () => {
    const input = state(
      [2, 2, 8, 16],
      [32, 64, 128, 256, 512, 1024, 4, 8, 16, 32, 64, 128],
    );
    const result = moveGrid(input, 'LEFT', () => 0);
    expect(result.moved).toBe(true);
    expect(result.state.over).toBe(true);
    expect(result.state.score).toBe(4);
  });
  test('2048 announces victory once and can continue to higher values', () => {
    const result = moveGrid(state([1024, 1024, 0, 0]), 'LEFT', lastEmpty());
    expect(result.state.won).toBe(true);
    expect(result.state.score).toBe(2048);
    expect(isGridState(result.state)).toBe(true);
    expect(moveGrid(result.state, 'DOWN').moved).toBe(false);
    const continued = continueGrid(result.state);
    expect(continued.keepPlaying).toBe(true);
    expect(moveGrid(continued, 'DOWN', () => 0).moved).toBe(true);
  });
  test('preserves total tile value plus exactly one spawned tile', () => {
    const input = state([4, 4, 8, 8], [2, 0, 2, 0, ...Array(8).fill(0)]);
    const result = moveGrid(input, 'LEFT', () => 0);
    expect(result.state.board.reduce((a, b) => a + b, 0)).toBe(
      input.board.reduce((a, b) => a + b, 0) + 2,
    );
  });
  test('validates snapshots and rejects corrupt or finished boards', () => {
    const input = newGrid(() => 0);
    expect(isGridState(input)).toBe(true);
    expect(isGridState({ ...input, board: [2] })).toBe(false);
    expect(isGridState({ ...input, board: [3, 2, ...Array(14).fill(0)] })).toBe(
      false,
    );
    expect(isGridState({ ...input, won: true })).toBe(false);
    expect(isGridState({ ...input, keepPlaying: true })).toBe(false);
    expect(isGridState({ ...input, over: true })).toBe(false);
    expect(isGridState({ ...input, score: -1 })).toBe(false);
  });
});
