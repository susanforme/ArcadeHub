import { describe, expect, test } from '@rstest/core';
import {
  flag,
  isMineState,
  levels,
  neighbors,
  newBoard,
  reveal,
} from '../src/games/minesweeper/logic';

function seeded() {
  let seed = 71;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function playing() {
  const state = newBoard();
  reveal(state, 40, seeded());
  return state;
}
describe('Minesweeper', () => {
  test('uses classic community presets and keeps the first cell and neighbors safe', () => {
    expect(Object.values(levels).map((l) => [l.cols, l.rows, l.mines])).toEqual(
      [
        [9, 9, 10],
        [16, 16, 40],
        [30, 16, 99],
      ],
    );
    for (const difficulty of Object.keys(levels) as (keyof typeof levels)[]) {
      const { cols, rows, mines } = levels[difficulty];
      for (const first of [
        0,
        cols - 1,
        Math.floor((cols * rows) / 2),
        cols * rows - 1,
      ]) {
        const state = newBoard(difficulty);
        expect(reveal(state, first, seeded())).toBe(true);
        expect(state.cells.filter((n) => n === -1)).toHaveLength(mines);
        for (const i of [first, ...neighbors(state, first)])
          expect(state.cells[i]).not.toBe(-1);
        expect(state.cells[first]).toBe(0);
        expect(
          state.cells.every(
            (n, i) =>
              n === -1 ||
              n ===
                neighbors(state, i).filter((j) => state.cells[j] === -1).length,
          ),
        ).toBe(true);
        expect(isMineState(state)).toBe(true);
      }
    }
  });
  test('floods blank areas without crossing flags or wrapping at board edges', () => {
    const state = newBoard();
    flag(state, 0);
    reveal(state, 40, seeded());
    expect(state.marks.filter((n) => n === 1).length).toBeGreaterThan(1);
    expect(state.marks[0]).toBe(2);
    expect(reveal(state, 0)).toBe(false);
    expect(neighbors(state, 8)).toEqual([7, 16, 17]);
    expect(flag(state, 40)).toBe(false);
    expect(flag(state, 0)).toBe(true);
    expect(state.marks[0]).toBe(0);
  });
  test('wins by revealing all safe cells without requiring flags and freezes terminal games', () => {
    const state = playing();
    state.cells.forEach((value, i) => {
      if (value !== -1) reveal(state, i);
    });
    expect(state.outcome).toBe('won');
    expect(state.marks.filter((n) => n === 2)).toHaveLength(10);
    expect(isMineState(state)).toBe(false);
    expect(flag(state, 0)).toBe(false);
    expect(reveal(state, 0)).toBe(false);
  });
  test('loses on a mine and records the detonated cell', () => {
    const state = playing();
    const mine = state.cells.indexOf(-1);
    reveal(state, mine);
    expect(state.outcome).toBe('lost');
    expect(state.exploded).toBe(mine);
    expect(isMineState(state)).toBe(false);
  });
  test('chords correctly flagged numbers, ignores incomplete flags, and punishes wrong flags', () => {
    for (const correct of [true, false]) {
      const state = playing();
      const center = state.cells.findIndex(
        (n, i) =>
          n > 0 &&
          neighbors(state, i).filter(
            (j) => state.cells[j] !== -1 && state.marks[j] === 0,
          ).length >= n,
      );
      expect(center).toBeGreaterThanOrEqual(0);
      reveal(state, center);
      const around = neighbors(state, center);
      expect(reveal(state, center)).toBe(false);
      const targets = correct
        ? around.filter((i) => state.cells[i] === -1)
        : around
            .filter((i) => state.cells[i] !== -1 && state.marks[i] === 0)
            .slice(0, state.cells[center]);
      targets.forEach((i) => {
        flag(state, i);
      });
      expect(reveal(state, center)).toBe(true);
      expect(state.outcome).toBe(correct ? 'playing' : 'lost');
      if (correct)
        expect(
          around.every((i) => state.cells[i] === -1 || state.marks[i] === 1),
        ).toBe(true);
    }
  });
  test('validates ready and resumed boards and rejects corrupt saves and invalid actions', () => {
    const state = playing();
    expect(isMineState(newBoard())).toBe(true);
    expect(isMineState(structuredClone(state))).toBe(true);
    for (const patch of [
      { version: 2 },
      { difficulty: 'toString' },
      { cells: [] },
      { marks: [] },
      { seconds: NaN },
      { seconds: -1 },
      { exploded: 0 },
      { outcome: 'won' },
    ])
      expect(isMineState({ ...state, ...patch })).toBe(false);
    const cells = [...state.cells];
    cells[40] = 8;
    expect(isMineState({ ...state, cells })).toBe(false);
    const marks = [...state.marks];
    marks[state.cells.indexOf(-1)] = 1;
    expect(isMineState({ ...state, marks })).toBe(false);
    expect(isMineState({ ...newBoard(), marks: Array(81).fill(1) })).toBe(
      false,
    );
    for (const index of [-1, 81, 0.5, NaN]) {
      expect(reveal(state, index)).toBe(false);
      expect(flag(state, index)).toBe(false);
    }
  });
});
