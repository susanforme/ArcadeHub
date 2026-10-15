import { describe, expect, test } from '@rstest/core';
import { readPangInput } from '../src/games/pang/input';
import {
  activePlatforms,
  isPangState,
  LEVELS,
  newPang,
  type PangInput,
  type PangState,
  splitBall,
  stepPang,
} from '../src/games/pang/logic';
import { InputManager } from '../src/shared/input';

const neutral: PangInput = { horizontal: 0, vertical: 0, fire: false };
function advance(state: PangState, frames: number, input: PangInput = neutral) {
  let next = state;
  for (let i = 0; i < frames; i++) next = stepPang(next, 0.1, input).state;
  return next;
}

describe('Pang', () => {
  test('continuous fire does not leave a stale press that restarts game over', () => {
    const controls = new InputManager();
    try {
      controls.press('DROP', 'virtual:A');
      expect(readPangInput(controls).fire).toBe(true);
      expect(readPangInput(controls)).toMatchObject({
        fire: true,
        restart: false,
      });
      controls.release('DROP', 'virtual:A');
      const state = newPang(4);
      state.phase = 'playing';
      state.lives = 1;
      state.freeze = 5;
      state.balls[0] = { ...state.balls[0], x: state.x, y: 185, size: 3 };
      const over = stepPang(state, 0.01, readPangInput(controls)).state;
      expect(over.phase).toBe('over');
      expect(readPangInput(controls).restart).toBe(false);
      controls.press('START', 'keyboard');
      controls.press('DROP', 'virtual:A');
      expect(readPangInput(controls).restart).toBe(true);
      expect(readPangInput(controls).restart).toBe(false);
    } finally {
      controls.destroy();
    }
  });

  test('includes 26 contiguous community layouts with platforms and ladders', () => {
    expect(LEVELS.map((level) => level.number)).toEqual(
      Array.from({ length: 26 }, (_, i) => i + 1),
    );
    expect(LEVELS[0].balls[0]).toMatchObject({
      x: 7,
      y: 19,
      size: 0,
      direction: -1,
    });
    expect(LEVELS[3].ladders).toHaveLength(2);
    for (let level = 1; level <= LEVELS.length; level++) {
      const state = newPang(10, level);
      expect(state.balls.length).toBeGreaterThan(0);
      expect(isPangState(state)).toBe(true);
    }
  });

  test('waits for input, splits each size into two children and clears the last small ball', () => {
    const ready = newPang(17);
    expect(stepPang(ready, 0.1, neutral).state).toBe(ready);
    const state = newPang(17);
    const original = state.balls[0];
    splitBall(state, original);
    expect(state.balls.map((ball) => ball.size)).toEqual([1, 1]);
    expect(state.balls.map((ball) => Math.sign(ball.vx))).toEqual([-1, 1]);
    for (const ball of [...state.balls]) splitBall(state, ball);
    for (const ball of [...state.balls]) splitBall(state, ball);
    expect(state.balls).toHaveLength(8);
    for (const ball of [...state.balls]) splitBall(state, ball);
    expect(state.balls).toHaveLength(0);
    const cleared = stepPang(
      { ...state, phase: 'playing' },
      0.01,
      neutral,
    ).state;
    expect(cleared.phase).toBe('cleared');
    expect(cleared.score).toBeGreaterThan(state.score);
    expect(
      stepPang(cleared, 0.01, { ...neutral, start: true }).state.level,
    ).toBe(2);
  });

  test('harpoons hit along their growing rope and keep the saved input state immutable', () => {
    const state = newPang(9);
    state.phase = 'playing';
    state.freeze = 5;
    state.balls[0] = {
      ...state.balls[0],
      x: state.x,
      y: 100,
      vy: 0,
      bonus: 0,
      childBonus: 0,
    };
    const next = advance(state, 4, { ...neutral, fire: true });
    expect(next.balls).toHaveLength(2);
    expect(next.score).toBe(100);
    expect(state.balls).toHaveLength(1);
    expect(state.shots).toHaveLength(0);
    expect(isPangState(JSON.parse(JSON.stringify(next)))).toBe(true);
  });

  test('one-wire and double-wire limits differ, while glue stays at the ceiling', () => {
    const state = newPang(2);
    state.phase = 'playing';
    state.freeze = 5;
    state.balls[0].x = 40;
    const single = advance(state, 6, { ...neutral, fire: true });
    const double = advance({ ...state, weapon: 'double' }, 6, {
      ...neutral,
      fire: true,
    });
    expect(single.shots).toHaveLength(1);
    expect(double.shots).toHaveLength(2);
    const glue = advance({ ...state, weapon: 'glue' }, 12, {
      ...neutral,
      fire: true,
    });
    expect(glue.shots).toHaveLength(1);
    expect(glue.shots[0].top).toBe(8);
    expect(glue.shots[0].stuck).toBeGreaterThan(0);
  });

  test('a harpoon destroys glass and leaves solid blocks intact', () => {
    const state = newPang(3, 2);
    state.phase = 'playing';
    state.x = 145;
    state.freeze = 5;
    state.balls[0].x = 30;
    const broken = advance(state, 7, { ...neutral, fire: true });
    expect(broken.broken).toContain(0);
    expect(activePlatforms(broken)).toHaveLength(1);
    expect(broken.score).toBe(100);
    const solid = newPang(3, 3);
    solid.phase = 'playing';
    solid.x = 55;
    solid.freeze = 5;
    solid.weapon = 'glue';
    solid.balls = solid.balls.map((ball) => ({ ...ball, x: 290, y: 35 }));
    const stuck = advance(solid, 8, { ...neutral, fire: true });
    expect(stuck.broken).toHaveLength(0);
    expect(stuck.shots[0].stuck).toBeGreaterThan(0);
  });

  test('climbs and stops on ladders without inventing a jump action', () => {
    const state = newPang(3, 4);
    state.phase = 'playing';
    state.x = 141;
    state.freeze = 5;
    const climbing = advance(state, 3, { ...neutral, vertical: -1 });
    expect(climbing.climbing).toBe(0);
    expect(climbing.y).toBeLessThan(200);
    const stopped = advance(climbing, 2);
    expect(stopped.y).toBe(climbing.y);
    const top = advance(climbing, 8, { ...neutral, vertical: -1 });
    expect(top.y).toBe(152);
  });

  test('a hit costs one life, restarts the stage and exhausts the final life', () => {
    const state = newPang(4);
    state.phase = 'playing';
    state.freeze = 5;
    state.balls[0] = { ...state.balls[0], x: state.x, y: 185, size: 3 };
    const hit = stepPang(state, 0.01, neutral).state;
    expect(hit.phase).toBe('dead');
    expect(hit.lives).toBe(2);
    const restarted = advance(hit, 14);
    expect(restarted.phase).toBe('ready');
    expect(restarted.time).toBe(100);
    expect(restarted.lives).toBe(2);
    expect(stepPang({ ...state, lives: 1 }, 0.01, neutral).state.phase).toBe(
      'over',
    );
    const shielded = stepPang({ ...state, shield: true }, 0.01, neutral).state;
    expect(shielded.lives).toBe(3);
    expect(shielded.shield).toBe(false);
    expect(shielded.invincible).toBeGreaterThan(0);
  });

  test('freeze, dynamite and a final-stage clear have finite outcomes', () => {
    const state = newPang(9);
    state.phase = 'playing';
    state.bonuses = [
      { id: state.nextId++, kind: 6, x: state.x, y: 185, life: 10 },
    ];
    const frozen = stepPang(state, 0.01, neutral).state;
    expect(frozen.freeze).toBeGreaterThan(4.9);
    const motion = advance(frozen, 2);
    expect(motion.balls[0].x).toBe(frozen.balls[0].x);
    expect(motion.balls[0].y).toBe(frozen.balls[0].y);
    frozen.bonuses = [
      { id: frozen.nextId++, kind: 5, x: frozen.x, y: 185, life: 10 },
    ];
    expect(
      stepPang(frozen, 0.01, neutral).state.balls.map((ball) => ball.size),
    ).toEqual(Array(8).fill(3));
    const final = newPang(2, 26);
    final.phase = 'playing';
    final.balls = [];
    expect(stepPang(final, 0.01, neutral).state.phase).toBe('won');
  });

  test('rejects malformed saves instead of restoring a broken stage', () => {
    const state = newPang(5);
    expect(isPangState({ ...state, level: 27 })).toBe(false);
    expect(isPangState({ ...state, time: Number.NaN })).toBe(false);
    expect(
      isPangState({ ...state, balls: [{ ...state.balls[0], size: 8 }] }),
    ).toBe(false);
    expect(
      isPangState({ ...state, balls: [state.balls[0], state.balls[0]] }),
    ).toBe(false);
    expect(isPangState({ ...state, climbing: 0 })).toBe(false);
    expect(isPangState({ ...state, broken: [0] })).toBe(false);
  });
});
