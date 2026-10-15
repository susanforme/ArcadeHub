import { describe, expect, test } from '@rstest/core';
import {
  GRAVITY,
  HEIGHT,
  isDoodleState,
  JUMP_SPEED,
  landingTime,
  MOVE_SPEED,
  newDoodle,
  nextPlatform,
  PLATFORM_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  START_Y,
  stepDoodle,
  WIDTH,
} from '../src/games/doodle-jump/logic';

const random = () => 0.5;

describe('Doodle Jump', () => {
  test('waits on the starting platform, then jumps without a jump button', () => {
    const state = newDoodle(random);
    expect(stepDoodle(state, 20, 0).state).toBe(state);
    const started = stepDoodle(state, 1 / 60, 0, true, random).state;
    expect(started.phase).toBe('jumping');
    expect(started.y).toBeLessThan(START_Y);
    expect(started.velocity).toBeLessThan(0);
    expect(state.phase).toBe('ready');
    expect(state.y).toBe(START_Y);
  });

  test('lands only while falling through a platform top and automatically bounces', () => {
    const state = {
      ...newDoodle(random),
      phase: 'jumping' as const,
      y: START_Y - 1,
      velocity: 180,
    };
    const landing = stepDoodle(state, 1 / 60, 0, false, random);
    expect(landing.bounced).toBe(true);
    expect(landing.state.velocity).toBeLessThan(-600);
    expect(state.velocity).toBe(180);
    const ascending = stepDoodle(
      { ...state, y: START_Y + 1, velocity: -180 },
      1 / 60,
      0,
      false,
      random,
    );
    expect(ascending.bounced).toBe(false);
    const miss = stepDoodle({ ...state, x: 20 }, 1 / 60, 0, false, random);
    expect(miss.bounced).toBe(false);
  });

  test('wraps at either edge and responds immediately to steering', () => {
    const state = {
      ...newDoodle(random),
      phase: 'jumping' as const,
      x: WIDTH - 1,
      velocity: -JUMP_SPEED,
    };
    const right = stepDoodle(state, 1 / 60, 1, false, random).state;
    expect(right.x).toBeLessThan(10);
    expect(right.facing).toBe(1);
    const left = stepDoodle(
      { ...state, x: 1 },
      1 / 60,
      -1,
      false,
      random,
    ).state;
    expect(left.x).toBeGreaterThan(WIDTH - 10);
    expect(left.facing).toBe(-1);
  });

  test('scrolls only upward, never subtracts height score and retains a bounded platform window', () => {
    const state = {
      ...newDoodle(random),
      phase: 'jumping' as const,
      y: 220,
      highest: 220,
      velocity: -JUMP_SPEED,
    };
    const rising = stepDoodle(state, 0.1, 0, false, random).state;
    expect(rising.cameraTop).toBeLessThan(0);
    const falling = stepDoodle(
      { ...rising, velocity: 120 },
      0.1,
      0,
      false,
      random,
    ).state;
    expect(falling.cameraTop).toBe(rising.cameraTop);
    expect(falling.score).toBe(rising.score);
    expect(falling.platforms.length).toBeLessThanOrEqual(24);
    expect(
      falling.platforms[falling.platforms.length - 1].y,
    ).toBeLessThanOrEqual(falling.cameraTop - 140);
  });

  test('generates reachable platforms at maximum difficulty and random extremes', () => {
    for (const sample of [0, 0.5, 0.999999]) {
      let previous = { id: 0, x: WIDTH / 2, y: -6000 };
      for (let id = 1; id <= 1000; id++) {
        const platform = nextPlatform(previous, id, () => sample);
        const rise = previous.y - platform.y;
        expect(rise).toBeGreaterThanOrEqual(60);
        expect(rise).toBeLessThan(JUMP_SPEED ** 2 / (2 * GRAVITY));
        // Even a takeoff from the far edge of the previous platform has steering room.
        const farEdgeDistance =
          Math.abs(platform.x - previous.x) +
          PLATFORM_WIDTH / 2 +
          PLAYER_RADIUS;
        expect(farEdgeDistance).toBeLessThan(MOVE_SPEED * landingTime(rise));
        expect(platform.x).toBeGreaterThanOrEqual(PLATFORM_WIDTH / 2);
        expect(platform.x).toBeLessThanOrEqual(WIDTH - PLATFORM_WIDTH / 2);
        previous = platform;
      }
    }
  });

  test('uses consistent ballistics across frame rates and bounds long frames', () => {
    let slow = stepDoodle(newDoodle(random), 0, 0, true, random).state;
    let fast = stepDoodle(newDoodle(random), 0, 0, true, random).state;
    for (let i = 0; i < 9; i++)
      slow = stepDoodle(slow, 1 / 30, 1, false, random).state;
    for (let i = 0; i < 36; i++)
      fast = stepDoodle(fast, 1 / 120, 1, false, random).state;
    expect(slow.y).toBeCloseTo(fast.y, 6);
    expect(slow.x).toBeCloseTo(fast.x, 6);
    expect(slow.velocity).toBeCloseTo(fast.velocity, 6);
    const bounded = stepDoodle(newDoodle(random), 10, 0, true, random).state;
    expect(bounded.y).toBeCloseTo(
      START_Y - JUMP_SPEED * 0.1 + (GRAVITY * 0.1 ** 2) / 2,
      6,
    );
  });

  test('falling out of view ends the run and cannot be resumed', () => {
    const state = {
      ...newDoodle(random),
      phase: 'jumping' as const,
      x: 20,
      y: HEIGHT + PLAYER_HEIGHT,
      velocity: 300,
    };
    const over = stepDoodle(state, 1 / 60, 0, false, random).state;
    expect(over.phase).toBe('over');
    expect(isDoodleState(over)).toBe(false);
    expect(stepDoodle(over, 1, 1, true).state).toBe(over);
  });

  test('accepts complete snapshots and rejects invalid numbers and platform data', () => {
    const state = newDoodle(random);
    expect(isDoodleState(state)).toBe(true);
    expect(isDoodleState(stepDoodle(state, 0.1, 1, true, random).state)).toBe(
      true,
    );
    expect(isDoodleState({ ...state, version: 2 })).toBe(false);
    expect(isDoodleState({ ...state, x: Number.NaN })).toBe(false);
    expect(
      isDoodleState({ ...state, velocity: Number.POSITIVE_INFINITY }),
    ).toBe(false);
    expect(isDoodleState({ ...state, score: -1 })).toBe(false);
    expect(isDoodleState({ ...state, platforms: [] })).toBe(false);
    expect(
      isDoodleState({
        ...state,
        platforms: [state.platforms[0], state.platforms[0]],
      }),
    ).toBe(false);
    expect(
      isDoodleState({ ...state, platforms: [null, ...state.platforms] }),
    ).toBe(false);
  });
});
