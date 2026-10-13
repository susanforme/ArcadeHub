import { describe, expect, test } from '@rstest/core';
import {
  BIRD_RY,
  FLAP_VELOCITY,
  GROUND,
  isFlappyState,
  newFlappy,
  PIPE_WIDTH,
  SPEED,
  stepFlappy,
} from '../src/games/flappy-bird/logic';

const random = () => 0.5;
describe('Flappy Bird', () => {
  test('waits for the first flap without moving or falling', () => {
    const state = newFlappy(random);
    expect(stepFlappy(state, 10, false, random)).toBe(state);
    expect(state.phase).toBe('ready');
  });
  test('a flap starts the game and supplies upward velocity', () => {
    const state = newFlappy(random);
    const next = stepFlappy(state, 1 / 60, true, random);
    expect(next.phase).toBe('flying');
    expect(next.y).toBeLessThan(state.y);
    expect(next.velocity).toBeGreaterThan(FLAP_VELOCITY);
    expect(next.velocity).toBeLessThan(0);
    expect(state.y).toBe(220);
    expect(state.pipes[0].x).toBe(338);
  });
  test('physics is consistent at 30 and 120 FPS', () => {
    let slow = stepFlappy(newFlappy(random), 0, true, random);
    let fast = stepFlappy(newFlappy(random), 0, true, random);
    for (let i = 0; i < 15; i++) slow = stepFlappy(slow, 1 / 30, false, random);
    for (let i = 0; i < 60; i++)
      fast = stepFlappy(fast, 1 / 120, false, random);
    expect(slow.y).toBeCloseTo(fast.y, 6);
    expect(slow.velocity).toBeCloseTo(fast.velocity, 6);
    expect(slow.pipes[0].x).toBeCloseTo(fast.pipes[0].x, 6);
  });
  test('touching a pipe or the ground ends the game', () => {
    const pipe = { ...newFlappy(random), phase: 'flying' as const };
    pipe.pipes[0] = { id: 0, x: 72, gapY: 100, passed: false };
    expect(stepFlappy(pipe, 1 / 60, false, random).phase).toBe('over');
    const ground = {
      ...newFlappy(random),
      phase: 'flying' as const,
      y: GROUND - BIRD_RY - 0.01,
      velocity: 100,
    };
    expect(stepFlappy(ground, 1 / 60, false, random).phase).toBe('over');
  });
  test('passing a pipe awards one point and never repeats', () => {
    const state = { ...newFlappy(random), phase: 'flying' as const, y: 200 };
    state.pipes[0].x = 8;
    const next = stepFlappy(state, 1 / 60, false, random);
    expect(next.phase).toBe('flying');
    expect(next.score).toBe(1);
    expect(stepFlappy(next, 1 / 60, false, random).score).toBe(1);
  });
  test('ceiling clamps the bird and long frames are bounded', () => {
    const state = { ...newFlappy(random), phase: 'flying' as const, y: 9 };
    expect(stepFlappy(state, 1 / 120, true, random).y).toBe(BIRD_RY);
    const bounded = stepFlappy(newFlappy(random), 5, true, random);
    expect(bounded.distance).toBeCloseTo(SPEED * 0.1, 6);
  });
  test('offscreen pipes are removed and new pipes have a safe random gap', () => {
    const state = { ...newFlappy(random), phase: 'flying' as const, y: 200 };
    state.pipes[0].x = -PIPE_WIDTH + 0.1;
    const next = stepFlappy(state, 1 / 60, false, random);
    expect(next.pipes.every((pipe) => pipe.x > -PIPE_WIDTH)).toBe(true);
    expect(next.pipes.length).toBeGreaterThan(0);
    expect(next.pipes.every((pipe) => pipe.gapY === 200)).toBe(true);
  });
  test('only valid unfinished snapshots can be restored', () => {
    expect(isFlappyState(newFlappy(random))).toBe(true);
    expect(
      isFlappyState(stepFlappy(newFlappy(random), 1 / 60, true, random)),
    ).toBe(true);
    expect(isFlappyState({ ...newFlappy(random), version: 99 })).toBe(false);
    expect(isFlappyState({ ...newFlappy(random), phase: 'over' })).toBe(false);
    expect(isFlappyState({ ...newFlappy(random), y: Number.NaN })).toBe(false);
    expect(
      isFlappyState({
        ...newFlappy(random),
        pipes: [{ id: 0, x: 0, gapY: 1, passed: false }],
      }),
    ).toBe(false);
  });
});
