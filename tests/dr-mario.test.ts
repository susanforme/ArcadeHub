import { describe, expect, test } from '@rstest/core';
import {
  type Cell,
  capsuleCells,
  type DrMarioState,
  fallDelay,
  findMatches,
  gravityStep,
  isDrMarioState,
  lockCapsule,
  moveCapsule,
  newDrMario,
  nextDrLevel,
  removeMatches,
  rotateCapsule,
  startDrMario,
  tickDrMario,
  virusCount,
} from '../src/games/dr-mario/logic';

const virus = (color: 0 | 1 | 2): Cell => ({
  color,
  kind: 'virus',
  bond: null,
});
const pill = (color: 0 | 1 | 2, bond: number | null = null): Cell => ({
  color,
  kind: 'pill',
  bond,
});
function fixture(): DrMarioState {
  const s = newDrMario();
  s.board.fill(null);
  s.board[127] = virus(2);
  s.phase = 'falling';
  s.active = { x: 3, y: 3, rotation: 0, colors: [0, 1] };
  return s;
}

describe('Dr. Mario classic bottle logic', () => {
  test('all 21 virus levels generate the exact count without pre-existing matches', () => {
    for (let level = 0; level <= 20; level++) {
      for (const random of [() => 0, () => 0.999, Math.random]) {
        const s = newDrMario(level, 1, random);
        expect(virusCount(s.board)).toBe(4 * (level + 1));
        expect(findMatches(s.board)).toEqual([]);
        expect(
          s.board
            .slice(0, (level >= 19 ? 4 : level >= 15 ? 5 : 6) * 8)
            .every((cell) => cell === null),
        ).toBe(true);
        expect(isDrMarioState(s)).toBe(true);
      }
    }
  });

  test('starting a game consumes the preview and spawns a horizontal capsule at the neck', () => {
    const ready = newDrMario(0, 0, () => 0.5);
    const started = startDrMario(ready, () => 0);
    expect(started.active).toEqual({ x: 3, y: 0, rotation: 0, colors: [1, 1] });
    expect(started.next).toEqual([0, 0]);
    expect(started.phase).toBe('falling');
    expect(isDrMarioState(started)).toBe(true);
    expect(ready.active).toBe(null);
  });

  test('rotation keeps color order, reverses with the other button and kicks off the right wall', () => {
    const s = fixture();
    const clockwise = rotateCapsule(s);
    if (!clockwise.active) throw new Error('Rotation must retain a capsule');
    expect(capsuleCells(clockwise.active)).toEqual([
      { x: 3, y: 2, color: 0 },
      { x: 3, y: 3, color: 1 },
    ]);
    expect(rotateCapsule(clockwise, false).active).toEqual(s.active);
    const edge = { ...clockwise, active: { ...clockwise.active, x: 7 } };
    const kicked = rotateCapsule(edge);
    expect(kicked.active?.x).toBe(6);
    expect(kicked.active?.rotation).toBe(2);
    expect(isDrMarioState(kicked)).toBe(true);
  });

  test('walls, occupied destinations and fully blocked rotations retain the active capsule', () => {
    const s = fixture();
    if (!s.active) throw new Error('Fixture must have an active capsule');
    s.active = { ...s.active, x: 0 };
    expect(moveCapsule(s, -1)).toBe(s);
    s.board[2 * 8] = virus(2);
    s.board[4 * 8] = virus(1);
    expect(rotateCapsule(s)).toBe(s);
    s.board[3 * 8 + 2] = virus(0);
    expect(moveCapsule(s, 1)).toBe(s);
  });

  test('matching includes viruses and pill halves in both axes, but not diagonals', () => {
    const board = Array<Cell | null>(128).fill(null);
    [27, 28, 29, 30].forEach((n, i) => {
      board[n] = i ? pill(0) : virus(0);
    });
    [12, 20, 36].forEach((n) => {
      board[n] = pill(0);
    });
    expect(new Set(findMatches(board))).toEqual(
      new Set([27, 28, 29, 30, 12, 20, 36]),
    );
    const diagonal = Array<Cell | null>(128).fill(null);
    [0, 9, 18, 27].forEach((n) => {
      diagonal[n] = virus(2);
    });
    expect(findMatches(diagonal)).toEqual([]);
  });

  test('removing one capsule half breaks its bond and lets only the surviving half fall', () => {
    const board = Array<Cell | null>(128).fill(null);
    board[80] = pill(0, 1);
    board[81] = pill(1, 1);
    board[88] = virus(2);
    expect(gravityStep(board).moved).toBe(false);
    const split = removeMatches(board, [80]);
    expect(split[81]?.bond).toBe(null);
    const dropped = gravityStep(split);
    expect(dropped.board[89]?.color).toBe(1);
    expect(dropped.board[88]?.kind).toBe('virus');
    expect(dropped.board[81]).toBe(null);
  });

  test('vertical pairs and stacked loose halves fall by one row together', () => {
    const board = Array<Cell | null>(128).fill(null);
    board[40] = pill(0, 1);
    board[48] = pill(1, 1);
    board[41] = pill(2);
    board[49] = pill(0);
    const fallen = gravityStep(board).board;
    expect(fallen[48]?.color).toBe(0);
    expect(fallen[56]?.color).toBe(1);
    expect(fallen[49]?.color).toBe(2);
    expect(fallen[57]?.color).toBe(0);
  });

  test('clearing scores only viruses with the speed multiplier and splits the next half', () => {
    const s = fixture();
    s.speed = 1;
    s.board[120] = virus(0);
    s.board[121] = virus(0);
    s.board[122] = pill(0);
    s.active = { x: 3, y: 15, rotation: 0, colors: [0, 1] };
    const locked = lockCapsule(s);
    expect(locked.phase).toBe('clearing');
    expect(locked.clear).toEqual([120, 121, 122, 123]);
    const cleared = tickDrMario(locked, 320);
    expect(cleared.score).toBe(600);
    expect(cleared.board[124]).toEqual(pill(1));
    expect(cleared.phase).toBe('gravity');
    expect(isDrMarioState(cleared)).toBe(true);
  });

  test('gravity resolves a second match before another capsule can spawn', () => {
    const s = fixture();
    s.phase = 'gravity';
    s.active = null;
    s.board[120] = virus(1);
    s.board[121] = pill(1);
    s.board[122] = pill(1);
    s.board[115] = pill(1);
    const falling = tickDrMario(s, 75);
    expect(falling.phase).toBe('gravity');
    expect(falling.board[123]?.color).toBe(1);
    const chain = tickDrMario(falling, 75);
    expect(chain.phase).toBe('clearing');
    expect(chain.active).toBe(null);
    expect(chain.clear).toEqual([120, 121, 122, 123]);
  });

  test('clearing the last virus advances a level and preserves the score', () => {
    const s = fixture();
    s.board[127] = null;
    s.board[120] = virus(0);
    s.board[121] = pill(0);
    s.board[122] = pill(0);
    s.active = { x: 3, y: 15, rotation: 0, colors: [0, 1] };
    let next = tickDrMario(lockCapsule(s), 320);
    next = tickDrMario(next, 75);
    expect(next.phase).toBe('cleared');
    const level = nextDrLevel(next);
    expect(level.level).toBe(1);
    expect(virusCount(level.board)).toBe(8);
    expect(level.score).toBe(100);
    expect(level.phase).toBe('falling');
    expect(nextDrLevel({ ...next, level: 20 }).level).toBe(20);
  });

  test('a blocked neck loses; soft drop and every ten capsules accelerate falling', () => {
    const ready = newDrMario();
    ready.board[3] = pill(1);
    expect(startDrMario(ready).phase).toBe('over');
    const s = fixture();
    if (!s.active) throw new Error('Fixture must have an active capsule');
    expect(tickDrMario(s, 50, true).active?.y).toBe(s.active.y + 1);
    expect(tickDrMario(s, 50).active?.y).toBe(s.active.y);
    expect(fallDelay({ ...s, capsules: 10 })).toBeLessThan(fallDelay(s));
    expect(fallDelay({ ...s, speed: 2 })).toBeLessThan(fallDelay(s));
  });

  test('saved active/clearing states round-trip and corrupt bonds or overlaps are rejected', () => {
    const s = fixture();
    expect(isDrMarioState(JSON.parse(JSON.stringify(s)))).toBe(true);
    const broken = [...s.board];
    broken[100] = pill(0, 1);
    for (const bad of [
      null,
      {},
      { ...s, version: 2 },
      { ...s, next: [3, 0] },
      { ...s, timer: Number.NaN },
      { ...s, active: { ...s.active, x: 8 } },
      { ...s, board: broken, nextBond: 2 },
      { ...s, phase: 'cleared' },
      { ...s, clear: [0] },
      { ...s, score: -1 },
      { ...s, level: 21 },
    ])
      expect(isDrMarioState(bad)).toBe(false);
    const overlap = [...s.board];
    overlap[27] = virus(2);
    expect(isDrMarioState({ ...s, board: overlap })).toBe(false);
  });
});
