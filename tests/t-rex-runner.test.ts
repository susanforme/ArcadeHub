import { describe, expect, test } from '@rstest/core';
import {
  collides,
  createObstacle,
  GROUND,
  isRunnerState,
  MAX_SPEED,
  newRunner,
  type RunnerState,
  START_SPEED,
  stepRunner,
} from '../src/games/t-rex-runner/logic';

const idle = { jump: false, held: false, duck: false };
const random = () => 0.3;
describe('T-Rex Runner', () => {
  test('waits for input and starts with a jump', () => {
    const state = newRunner();
    expect(stepRunner(state, 2, idle)).toBe(state);
    const next = stepRunner(state, 1 / 60, { ...idle, jump: true, held: true });
    expect(next.phase).toBe('running');
    expect(next.lift).toBeGreaterThan(0);
    expect(state.distance).toBe(0);
  });
  test('holding jump goes higher than a short tap', () => {
    let held = newRunner(),
      tap = newRunner();
    let heldPeak = 0,
      tapPeak = 0;
    for (let frame = 0; frame < 80; frame++) {
      held = stepRunner(held, 1 / 120, {
        jump: frame === 0,
        held: true,
        duck: false,
      });
      tap = stepRunner(tap, 1 / 120, {
        jump: frame === 0,
        held: false,
        duck: false,
      });
      heldPeak = Math.max(heldPeak, held.lift);
      tapPeak = Math.max(tapPeak, tap.lift);
    }
    expect(heldPeak).toBeGreaterThan(tapPeak + 20);
    expect(tapPeak).toBeGreaterThan(35);
    expect(tap.lift).toBe(0);
  });
  test('down crouches on the ground and accelerates falling in the air', () => {
    const state = { ...newRunner(), phase: 'running' as const };
    expect(stepRunner(state, 1 / 60, { ...idle, duck: true }).ducking).toBe(
      true,
    );
    const airborne = { ...state, lift: 60, velocity: -200 };
    const falling = stepRunner(airborne, 1 / 60, { ...idle, duck: true });
    expect(falling.velocity).toBeGreaterThan(400);
    expect(falling.lift).toBeLessThan(airborne.lift);
    expect(falling.ducking).toBe(false);
  });
  test('jumping avoids cactus and crouching avoids a mid-height bird', () => {
    const state = { ...newRunner(), phase: 'running' as const };
    const cactus = {
      id: 0,
      kind: 'small' as const,
      x: 50,
      y: GROUND - 35,
      size: 1,
    };
    expect(collides(state, cactus)).toBe(true);
    expect(collides({ ...state, lift: 75 }, cactus)).toBe(false);
    const bird = {
      id: 1,
      kind: 'bird' as const,
      x: 50,
      y: GROUND - 65,
      size: 1,
    };
    expect(collides(state, bird)).toBe(true);
    expect(collides({ ...state, ducking: true }, bird)).toBe(false);
    expect(
      collides({ ...state, ducking: true }, { ...bird, y: GROUND - 40 }),
    ).toBe(true);
  });
  test('collision ends the run and stops subsequent movement', () => {
    const state = {
      ...newRunner(),
      phase: 'running' as const,
      nextId: 1,
      obstacles: [
        { id: 0, kind: 'large' as const, x: 50, y: GROUND - 50, size: 1 },
      ],
    };
    const next = stepRunner(state, 1 / 60, idle);
    expect(next.phase).toBe('over');
    expect(stepRunner(next, 1, { ...idle, jump: true })).toBe(next);
  });
  test('acceleration and distance are consistent across frame rates', () => {
    let slow: RunnerState = { ...newRunner(), phase: 'running' as const };
    let fast: RunnerState = { ...newRunner(), phase: 'running' as const };
    for (let i = 0; i < 30; i++) slow = stepRunner(slow, 1 / 30, idle, random);
    for (let i = 0; i < 120; i++)
      fast = stepRunner(fast, 1 / 120, idle, random);
    expect(slow.distance).toBeCloseTo(fast.distance, 6);
    expect(slow.speed).toBeGreaterThan(START_SPEED);
    expect(slow.speed).toBeCloseTo(fast.speed, 6);
    const capped = stepRunner(
      { ...newRunner(), phase: 'running', speed: MAX_SPEED },
      0.1,
      idle,
    );
    expect(capped.speed).toBe(MAX_SPEED);
  });
  test('birds require higher speed and obstacles spawn after the initial safe period', () => {
    expect(createObstacle(0, START_SPEED, () => 0.9).kind).not.toBe('bird');
    expect(createObstacle(0, 600, () => 0.9).kind).toBe('bird');
    const state = stepRunner(
      { ...newRunner(), phase: 'running', spawnIn: 0.01 },
      0.1,
      idle,
      random,
    );
    expect(state.obstacles).toHaveLength(1);
    expect(state.spawnIn).toBeGreaterThan(0);
    expect(isRunnerState(state)).toBe(true);
  });
  test('night mode starts at 700 points and counts down', () => {
    const state = {
      ...newRunner(),
      phase: 'running' as const,
      distance: 27979,
      score: 699,
    };
    const night = stepRunner(state, 0.1, idle);
    expect(night.nightRemaining).toBeGreaterThan(11);
    expect(stepRunner(night, 0.1, idle).nightRemaining).toBeLessThan(
      night.nightRemaining,
    );
  });
  test('rejects corrupt or finished snapshots', () => {
    expect(isRunnerState(newRunner())).toBe(true);
    expect(isRunnerState({ ...newRunner(), phase: 'over' })).toBe(false);
    expect(isRunnerState({ ...newRunner(), speed: Number.NaN })).toBe(false);
    expect(isRunnerState({ ...newRunner(), lift: -1 })).toBe(false);
    expect(isRunnerState({ ...newRunner(), score: 99 })).toBe(false);
    expect(
      isRunnerState({
        ...newRunner(),
        nextId: 1,
        obstacles: [{ id: 0, kind: 'bird', x: 100, y: 1, size: 1 }],
      }),
    ).toBe(false);
  });
});
