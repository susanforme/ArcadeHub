import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  isMoleState,
  LEVELS,
  type MoleState,
  newMole,
  startRound,
  stepMole,
  whack,
} from '../src/games/whack-a-mole/logic';

function playing() {
  const s = newMole();
  startRound(s);
  return s;
}
function put(s: MoleState, kind: 'mole' | 'gold' | 'bomb', index = 0) {
  const lifetime = LEVELS[s.level - 1].lifetime;
  s.holes[index] = { kind, lifetime, remaining: lifetime };
}
describe('Whack-a-Mole', () => {
  test('is discovered as a touch-first arcade plugin', () => {
    const manifest = games.find((g) => g.id === 'whack-a-mole');
    expect(manifest?.category).toBe('categories.arcade');
    expect(manifest?.touchControls).toEqual([]);
  });
  test('ready and clear screens do not spend time or allow hits', () => {
    const s = newMole();
    stepMole(s, 10);
    expect(s.remaining).toBe(30);
    expect(whack(s, 0)).toBeNull();
    expect(startRound(s)).toBe(true);
    expect(startRound(s)).toBe(false);
  });
  test('each mole pays once, gold pays more, and every five hits raises the bonus', () => {
    const s = playing();
    for (let i = 0; i < 5; i++) {
      put(s, 'mole');
      expect(whack(s, 0)?.points).toBe(10);
      expect(whack(s, -1)).toBeNull();
    }
    put(s, 'gold');
    expect(whack(s, 0)?.points).toBe(35);
    expect(s.score).toBe(85);
    expect(s.combo).toBe(6);
    expect(whack(s, 0)).toBeNull();
    expect(s.score).toBe(85);
    expect(s.combo).toBe(0);
  });
  test('dynamite costs one heart and never awards score; a repeated click cannot hurt twice', () => {
    const s = playing();
    s.combo = 3;
    put(s, 'bomb');
    expect(whack(s, 0)).toEqual({ kind: 'bomb', points: 0 });
    expect(s.lives).toBe(4);
    expect(s.combo).toBe(0);
    whack(s, 0);
    expect(s.lives).toBe(4);
    expect(s.score).toBe(0);
  });
  test('escaped moles cost hearts; gold and dynamite can be safely ignored', () => {
    const s = playing();
    put(s, 'mole', 0);
    put(s, 'gold', 1);
    put(s, 'bomb', 2);
    for (const h of s.holes) if (h) h.remaining = 0.01;
    expect(stepMole(s, 0.02, () => 0.5)).toEqual([0]);
    expect(s.lives).toBe(4);
    expect(s.misses).toBe(1);
  });
  test('spawn selects vacant cells, caps concurrent targets and offers all three kinds', () => {
    for (const [roll, kind] of [
      [0, 'gold'],
      [0.5, 'mole'],
      [0.99, 'bomb'],
    ] as const) {
      const s = playing();
      s.spawnIn = 0;
      stepMole(s, 0.01, () => roll);
      expect(s.holes.find(Boolean)?.kind).toBe(kind);
    }
    const s = playing();
    put(s, 'bomb', 0);
    put(s, 'bomb', 1);
    s.spawnIn = 0;
    stepMole(s, 0.01, () => 0);
    expect(s.holes.filter(Boolean)).toHaveLength(2);
    expect(s.holes[0]?.kind).toBe('bomb');
  });
  test('timeout requires the round goal and does not penalize targets leaving at the bell', () => {
    const fail = playing();
    fail.remaining = 0.01;
    stepMole(fail, 0.1);
    expect(fail.phase).toBe('over');
    const pass = playing();
    pass.remaining = 0.01;
    pass.roundScore = pass.score = 160;
    put(pass, 'mole');
    stepMole(pass, 0.1);
    expect(pass.phase).toBe('clear');
    expect(pass.lives).toBe(5);
    expect(pass.holes.every((h) => h === null)).toBe(true);
    expect(isMoleState(pass)).toBe(true);
  });
  test('next round resets its goal progress, retains total score and restores only one heart', () => {
    const s = playing();
    s.score = s.roundScore = 160;
    s.lives = 3;
    stepMole(s, 30);
    const saved = s.remaining;
    stepMole(s, 10);
    expect(s.remaining).toBe(saved);
    expect(startRound(s)).toBe(true);
    expect(s.level).toBe(2);
    expect(s.score).toBe(160);
    expect(s.roundScore).toBe(0);
    expect(s.lives).toBe(4);
    expect(s.remaining).toBe(30);
  });
  test('zero hearts ends immediately even with enough points', () => {
    const s = playing();
    s.score = s.roundScore = 1000;
    s.lives = 1;
    put(s, 'bomb');
    whack(s, 0);
    expect(s.phase).toBe('over');
    expect(startRound(s)).toBe(false);
    expect(whack(s, 0)).toBeNull();
  });
  test('all five rounds can be won through public gameplay, with increasing difficulty', () => {
    const s = newMole();
    for (let level = 1; level <= 5; level++) {
      startRound(s);
      for (let frame = 0; frame < 3000 && s.phase === 'playing'; frame++) {
        stepMole(s, 1 / 60, () => 0.5);
        s.holes.forEach((hole, i) => {
          if (hole) whack(s, i);
        });
      }
      expect(s.roundScore).toBeGreaterThanOrEqual(LEVELS[level - 1].goal);
      expect(s.phase).toBe(level === 5 ? 'won' : 'clear');
      if (level < 5) expect(isMoleState(s)).toBe(true);
    }
    expect(s.lives).toBe(5);
  });
  test('valid snapshots round-trip; corrupt snapshots and impossible phases are rejected', () => {
    const s = playing();
    put(s, 'mole');
    stepMole(s, 0.1);
    expect(isMoleState(newMole())).toBe(true);
    expect(isMoleState(JSON.parse(JSON.stringify(s)))).toBe(true);
    for (const patch of [
      { version: 2 },
      { level: 0 },
      { level: 6 },
      { remaining: NaN },
      { remaining: 0 },
      { lives: 0 },
      { lives: 6 },
      { phase: 'won' },
      { phase: 'clear' },
      { score: -1 },
      { combo: 10 },
      { holes: [] },
      { spawnIn: Infinity },
      { holes: Array(9).fill({ kind: 'bomb', lifetime: 9, remaining: 3 }) },
      {
        holes: Array(9)
          .fill(null)
          .fill({ kind: 'mole', lifetime: 1.65, remaining: -1 }, 0, 1),
      },
    ])
      expect(isMoleState({ ...s, ...patch })).toBe(false);
    expect(isMoleState(null)).toBe(false);
  });
});
