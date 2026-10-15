import { describe, expect, test } from '@rstest/core';
import {
  GROUND,
  isSnowState,
  newSnow,
  SNOW_HITS,
  type SnowInput,
  type SnowState,
  STAGES,
  stepSnow,
} from '../src/games/snow-bros/logic';

const idle: SnowInput = { move: 0, jump: false, fire: false, start: false };
function playing() {
  const state = newSnow();
  state.phase = 'playing';
  return state;
}
function ticks(state: SnowState, count: number, input = idle) {
  for (let i = 0; i < count; i++) stepSnow(state, input);
}

describe('Snow Bros.', () => {
  test('waits for input, jumps through a platform and lands on its visible top', () => {
    const state = newSnow();
    stepSnow(state, idle);
    expect(state.phase).toBe('ready');
    expect(state.time).toBe(0);
    stepSnow(state, { ...idle, start: true });
    state.player.x = 80;
    state.enemies = state.enemies.slice(0, 1);
    stepSnow(state, { ...idle, jump: true });
    ticks(state, 20);
    expect(state.player.y).toBeLessThan(160);
    ticks(state, 40);
    expect(state.player.y).toBe(160);
    expect(state.player.vy).toBe(0);
  });

  test('needs four snow hits, then pushes only a nearby fully frozen enemy', () => {
    const state = playing();
    state.player.x = 56;
    state.enemies = [{ ...state.enemies[0], x: 110, y: GROUND, cooldown: 3 }];
    ticks(state, 70, { ...idle, fire: true });
    const target = state.enemies[0];
    expect(target.snow).toBe(SNOW_HITS);
    expect(target.rolling).toBe(false);
    expect(state.score).toBe(0);
    state.player.x = target.x - 28;
    state.player.cooldown = 0;
    stepSnow(state, { ...idle, fire: true });
    expect(target.rolling).toBe(true);
    expect(state.score).toBeGreaterThanOrEqual(100);
  });

  test('rolling snowballs clear a row, increase combo rewards, and settle the stage', () => {
    const state = playing();
    state.player.x = 92;
    state.enemies = [120, 164, 206].map((x, i) => ({
      ...state.enemies[i],
      x,
      y: GROUND,
      snow: SNOW_HITS,
      thaw: 6,
    }));
    stepSnow(state, { ...idle, fire: true });
    ticks(state, 85);
    expect(state.enemies).toHaveLength(0);
    expect(state.phase).toBe('clear');
    expect(state.bestCombo).toBe(3);
    expect(state.score).toBeGreaterThanOrEqual(700);
    expect(state.pickups).toHaveLength(0);
  });

  test('partial snow thaws, and a wall bounce sends a rolling ball down a shelf', () => {
    const state = playing();
    const target = state.enemies[0];
    target.snow = 1;
    target.thaw = 0.001;
    stepSnow(state, idle);
    expect(target.snow).toBe(0);
    Object.assign(target, {
      x: 17,
      y: 64,
      facing: -1,
      snow: 4,
      thaw: 6,
      rolling: true,
      life: 4,
      combo: 1,
    });
    stepSnow(state, idle);
    expect(target.facing).toBe(1);
    expect(target.y).toBeGreaterThan(64);
  });

  test('simultaneous enemy hits and timeout consume the last life only once', () => {
    const state = playing();
    state.lives = 1;
    state.player.invulnerable = 0;
    state.remaining = 0;
    Object.assign(state.enemies[0], { x: state.player.x, y: GROUND });
    state.shots = [0, 1].map(() => ({
      id: state.nextId++,
      x: state.player.x,
      y: GROUND - 13,
      vx: 0,
      ttl: 1,
      hostile: true,
    }));
    stepSnow(state, idle);
    expect(state.lives).toBe(0);
    expect(state.phase).toBe('over');
    const score = state.score;
    ticks(state, 120, { ...idle, fire: true });
    expect(state.score).toBe(score);
    expect(isSnowState(state)).toBe(false);
  });

  test('advances through four different stages and finishes after the final one', () => {
    const state = playing();
    for (let stage = 0; stage < STAGES.length; stage++) {
      expect(state.stage).toBe(stage);
      state.enemies = [];
      stepSnow(state, idle);
      expect(state.phase).toBe('clear');
      ticks(state, 122);
    }
    expect(state.phase).toBe('won');
    expect(isSnowState(state)).toBe(false);
  });

  test('validates complete resumable snapshots and rejects corrupt or duplicate entities', () => {
    const state = playing();
    expect(isSnowState(state)).toBe(true);
    ticks(state, 45, { ...idle, fire: true, move: 1 });
    expect(isSnowState(state)).toBe(true);
    expect(isSnowState({ ...state, version: 2 })).toBe(false);
    expect(isSnowState({ ...state, stage: 4 })).toBe(false);
    expect(isSnowState({ ...state, score: -1 })).toBe(false);
    expect(
      isSnowState({ ...state, player: { ...state.player, x: Number.NaN } }),
    ).toBe(false);
    expect(isSnowState({ ...state, enemies: [null] })).toBe(false);
    expect(
      isSnowState({ ...state, enemies: [state.enemies[0], state.enemies[0]] }),
    ).toBe(false);
    expect(
      isSnowState({
        ...state,
        shots: [{ id: 1, x: 50, y: 100, vx: Infinity, ttl: 1, hostile: true }],
      }),
    ).toBe(false);
  });
});
