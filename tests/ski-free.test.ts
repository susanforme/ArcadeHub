import { describe, expect, test } from '@rstest/core';
import {
  isSkiState,
  jumpSki,
  newSkiState,
  stepSki,
} from '../src/games/ski-free/logic';

describe('ski free', () => {
  test('collisions cost a life but jumps clear obstacles', () => {
    const s = newSkiState();
    s.spawn = 0.8;
    s.nextId = 2;
    s.obstacles = [{ id: 1, x: 300, y: 285, kind: 'tree' }];
    stepSki(s, 0.01, 0, false);
    expect(s.lives).toBe(2);
    const jump = newSkiState();
    jump.spawn = 0.8;
    jump.nextId = 2;
    jump.obstacles = [{ id: 1, x: 300, y: 285, kind: 'rock' }];
    expect(jumpSki(jump)).toBe(true);
    expect(jumpSki(jump)).toBe(false);
    stepSki(jump, 0.01, 0, false);
    expect(jump.lives).toBe(3);
  });
  test('ramps award points and launch the skier', () => {
    const s = newSkiState();
    s.spawn = 0.8;
    s.nextId = 2;
    s.obstacles = [{ id: 1, x: 300, y: 285, kind: 'ramp' }];
    stepSki(s, 0.01, 0, false);
    expect(s.bonus).toBe(100);
    expect(s.jump).toBeGreaterThan(1);
    expect(s.obstacles).toHaveLength(0);
  });
  test('braking lets the pursuing yeti catch up', () => {
    const s = newSkiState();
    s.distance = 1100;
    s.speed = 95;
    const before = s.yetiGap;
    stepSki(s, 0.05, 0, true);
    expect(s.yetiGap).toBeLessThan(before);
  });
  test('snapshots reject duplicate obstacles and non-finite state', () => {
    const s = newSkiState();
    expect(isSkiState(s)).toBe(true);
    expect(isSkiState({ ...s, distance: Infinity })).toBe(false);
    expect(isSkiState({ ...s, obstacles: [null] })).toBe(false);
    s.nextId = 2;
    s.obstacles = [
      { id: 1, x: 300, y: 500, kind: 'tree' },
      { id: 1, x: 200, y: 600, kind: 'rock' },
    ];
    expect(isSkiState(s)).toBe(false);
  });
});
