import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import { LEVELS } from '../src/games/fireboy-watergirl/levels';
import {
  continueTemple,
  gateOpen,
  type HeroInput,
  isTempleState,
  newTemple,
  plateActive,
  stepTemple,
  type TempleState,
} from '../src/games/fireboy-watergirl/logic';

const idle = (): [HeroInput, HeroInput] => [
  { move: 0, jump: false, interact: false },
  { move: 0, jump: false, interact: false },
];
function playing(level = 0) {
  const s = newTemple(level);
  s.phase = 'playing';
  return s;
}
function run(s: TempleState, seconds: number, inputs = idle()) {
  for (let i = 0; i < seconds * 120; i++) {
    stepTemple(s, 1 / 120, inputs);
    inputs = inputs.map((input) => ({
      ...input,
      jump: false,
      interact: false,
    })) as [HeroInput, HeroInput];
  }
}
describe('Fireboy & Watergirl', () => {
  test('discovers the two-player plugin with touch switching and continue', () => {
    const game = games.find((game) => game.id === 'fireboy-watergirl');
    expect(game?.localPlayers).toBe(2);
    expect(
      game?.virtualGamepad?.buttons?.map((button) => button.action),
    ).toEqual(['UP', 'SECONDARY', 'MODE', 'DROP']);
  });
  test('ready and failed phases freeze the timer; grounded jumps land consistently', () => {
    const s = newTemple();
    stepTemple(s, 0.1, idle());
    expect(s.remaining).toBe(150);
    s.phase = 'playing';
    const inputs = idle();
    inputs[0].jump = true;
    run(s, 0.25, inputs);
    expect(s.heroes[0].y).toBeLessThan(490);
    run(s, 0.7);
    expect(s.heroes[0].y).toBe(560);
    expect(s.heroes[0].grounded).toBe(true);
    s.phase = 'failed';
    const time = s.remaining;
    run(s, 1);
    expect(s.remaining).toBe(time);
  });
  test('each hero survives their own pool and dies in the opposite pool', () => {
    for (const [hero, x, safe] of [
      [0, 255, true],
      [1, 360, true],
      [0, 360, false],
      [1, 255, false],
    ] as const) {
      const s = playing();
      s.heroes[hero].x = x;
      run(s, 0.05);
      expect(s.phase).toBe(safe ? 'playing' : 'failed');
    }
    for (const hero of [0, 1]) {
      const s = playing(2);
      s.heroes[hero].x = 295;
      run(s, 0.05);
      expect(s.reason).toBe('poison');
    }
  });
  test('only matching gems score, and each gem pays once', () => {
    const s = playing();
    s.heroes[1].x = 160;
    run(s, 0.05);
    expect(s.gems[0]).toBe(false);
    expect(s.score).toBe(0);
    s.heroes[0].x = 160;
    run(s, 0.05);
    expect(s.gems[0]).toBe(true);
    expect(s.score).toBe(100);
    run(s, 1);
    expect(s.score).toBe(100);
  });
  test('plates open only linked gates, release closes them, far-side lever latches', () => {
    const s = playing(1);
    expect(gateOpen(s, 0)).toBe(false);
    expect(gateOpen(s, 1)).toBe(false);
    s.heroes[0].x = 490;
    expect(plateActive(s, 0)).toBe(true);
    expect(gateOpen(s, 0)).toBe(true);
    s.heroes[0].x = 100;
    expect(gateOpen(s, 0)).toBe(false);
    s.heroes[1].x = 570;
    const input = idle();
    input[1].interact = true;
    expect(stepTemple(s, 0, input)).toContain('lever');
    s.heroes[1].x = 100;
    expect(gateOpen(s, 0)).toBe(true);
    expect(gateOpen(s, 1)).toBe(false);
    const locked = playing(1);
    locked.heroes[0].x = 500;
    const right = idle();
    right[0].move = 1;
    run(locked, 0.5, right);
    // A crate is not on the plate, but the approaching player can open it by standing there.
    expect(locked.heroes[0].x).toBeGreaterThan(500);
  });
  test('pushed crates hold plates when both players leave', () => {
    const s = playing();
    s.heroes[1].x = 390;
    const input = idle();
    input[1].move = 1;
    run(s, 0.3, input);
    s.heroes[0].x = 100;
    s.heroes[1].x = 120;
    expect(s.crates[0].x).toBeGreaterThan(440);
    expect(plateActive(s, 0)).toBe(true);
  });
  test('all gems and both correct exits are required; victory adds bonus once', () => {
    const s = playing();
    const map = LEVELS[0];
    s.heroes[0] = { ...s.heroes[0], x: map.exits[0].x, y: map.exits[0].y };
    s.heroes[1] = { ...s.heroes[1], x: map.exits[1].x, y: map.exits[1].y };
    run(s, 0.05);
    expect(s.phase).toBe('playing');
    s.gems.fill(true);
    s.heroes[1].x = 770;
    run(s, 0.05);
    expect(s.phase).toBe('playing');
    s.heroes[1].x = map.exits[1].x;
    expect(stepTemple(s, 1 / 120, idle())).toContain('clear');
    const score = s.score;
    run(s, 1);
    expect(s.score).toBe(score);
    const next = continueTemple(s);
    expect(next.level).toBe(1);
    expect(next.baseScore).toBe(score);
    const final = playing(2);
    final.gems.fill(true);
    final.heroes.forEach((hero, i) => {
      hero.x = LEVELS[2].exits[i].x;
      hero.y = LEVELS[2].exits[i].y;
    });
    expect(stepTemple(final, 1 / 120, idle())).toContain('won');
  });
  test('timeout fails, retry resets level score, and snapshots preserve progress', () => {
    const s = playing(1);
    s.baseScore = 1000;
    s.score = 1300;
    s.gems[0] = true;
    s.latched[0] = true;
    expect(isTempleState(JSON.parse(JSON.stringify(s)))).toBe(true);
    s.remaining = 0.005;
    expect(stepTemple(s, 0.1, idle())).toContain('failed');
    expect(s.reason).toBe('time');
    const retry = continueTemple(s);
    expect(retry.level).toBe(1);
    expect(retry.score).toBe(1000);
    expect(retry.gems.some(Boolean)).toBe(false);
    expect(isTempleState(s)).toBe(true);
    for (const patch of [
      { version: 2 },
      { level: 50 },
      { remaining: NaN },
      { heroes: [null, null] },
      { crates: [null] },
      { gems: [] },
      { latched: [] },
      { selected: 3 },
      { baseScore: -1 },
      { phase: 'clear' },
    ])
      expect(isTempleState({ ...retry, ...patch })).toBe(false);
  });
  test('every temple is completable using actual movement, jumps and cooperation', () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const s = playing(level);
      const tick = (i: number, move = 0, jump = false, interact = false) => {
        const input = idle();
        input[i] = { move, jump, interact };
        stepTemple(s, 1 / 120, input);
        expect(s.phase).not.toBe('failed');
      };
      const move = (i: number, x: number, jump = false) => {
        if (jump) tick(i, Math.sign(x - s.heroes[i].x), true);
        let frames = 0;
        while (
          s.phase === 'playing' &&
          Math.abs(s.heroes[i].x - x) > 2 &&
          frames++ < 600
        )
          tick(i, Math.sign(x - s.heroes[i].x));
        expect(frames).toBeLessThan(600);
      };
      const land = (i: number) => {
        let frames = 0;
        while (!s.heroes[i].grounded && frames++ < 180) tick(i);
        expect(s.heroes[i].grounded).toBe(true);
      };
      const hop = (i: number, x: number) => {
        move(i, x, true);
        land(i);
      };
      expect(s.latched.every((_, i) => !gateOpen(s, i))).toBe(true);
      if (level === 0) {
        move(0, 300);
        hop(0, 430);
        move(1, 200);
        hop(1, 310);
        move(1, 441);
      } else if (level === 1) {
        move(0, 175);
        hop(0, 280);
        move(0, 360);
        hop(0, 445);
        move(1, 280);
        hop(1, 367);
        hop(1, 440);
      } else {
        move(0, 240);
        hop(0, 338);
        hop(0, 445);
        move(1, 145);
        hop(1, 244);
        hop(1, 340);
        move(1, 385);
        move(1, 435);
      }
      move(0, level === 1 ? 490 : 480);
      land(0);
      expect(gateOpen(s, 0)).toBe(true);
      hop(1, 570);
      tick(1, 0, false, true);
      hop(0, 570);
      for (const i of [0, 1]) {
        hop(i, 615);
        hop(i, 695);
        hop(i, 765);
      }
      if (level > 0) {
        move(0, 765);
        move(1, 855);
        tick(1, 0, false, true);
        move(0, 850);
      }
      move(0, 905);
      move(0, 832);
      move(1, 900);
      expect(s.gems.every(Boolean)).toBe(true);
      expect(s.phase).toBe(level === LEVELS.length - 1 ? 'won' : 'clear');
      expect(s.remaining).toBeGreaterThan(0);
    }
  });
});
