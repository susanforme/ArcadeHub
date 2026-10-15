import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  HOMES,
  hop,
  isFrogState,
  LANES,
  newFrog,
  obstacles,
  speedScale,
  stepFrog,
} from '../src/games/frogger/logic';

function playing() {
  const state = newFrog();
  state.phase = 'playing';
  return state;
}

describe('Frogger', () => {
  test('is discovered with four directions and a forward button', () => {
    const manifest = games.find((game) => game.id === 'frogger');
    expect(manifest?.virtualGamepad?.directions).toHaveLength(4);
    expect(manifest?.virtualGamepad?.buttons?.[0].action).toBe('DROP');
  });

  test('ready screen freezes the world and the first hop starts the timer', () => {
    const state = newFrog();
    stepFrog(state, 10);
    expect(state.remaining).toBe(30);
    expect(state.clock).toBe(0);
    expect(hop(state, 'UP')).toBe('hop');
    expect(state.phase).toBe('playing');
    expect(state.frog.row).toBe(13);
    expect(state.score).toBe(10);
    expect(hop(state, 'UP')).toBeUndefined();
    stepFrog(state, 0.05);
    expect(state.remaining).toBeCloseTo(29.95);
  });

  test('moving down and up cannot farm row points', () => {
    const state = playing();
    hop(state, 'UP');
    state.cooldown = 0;
    hop(state, 'DOWN');
    state.cooldown = 0;
    hop(state, 'UP');
    expect(state.score).toBe(10);
    state.cooldown = 0;
    state.frog.x = 20;
    expect(hop(state, 'LEFT')).toBeUndefined();
    expect(state.frog.x).toBe(20);
  });

  test('traffic collision costs exactly one life and preserves filled homes', () => {
    const state = playing();
    state.homes[0] = true;
    state.frog = { x: 100, row: 13, facing: 'UP' };
    expect(stepFrog(state, 0.01)).toBe('death');
    expect(state.lives).toBe(2);
    for (let i = 0; i < 13; i++) stepFrog(state, 0.1);
    expect(state.lives).toBe(2);
    expect(state.phase).toBe('playing');
    expect(state.frog.row).toBe(14);
    expect(state.homes[0]).toBe(true);
    expect(state.remaining).toBeLessThanOrEqual(30);
  });

  test('fast traffic is detected within a slow frame', () => {
    const state = playing();
    state.level = 11;
    state.frog = { x: 70, row: 10, facing: 'UP' };
    expect(stepFrog(state, 0.1)).toBe('death');
    expect(state.death).toBe('car');
  });

  test('logs carry the frog and river gaps drown it', () => {
    const state = playing();
    state.frog = { x: 90, row: 3, facing: 'UP' };
    stepFrog(state, 0.1);
    expect(state.frog.x).toBeCloseTo(92.8);
    expect(state.lives).toBe(3);
    state.frog.x = 200;
    expect(stepFrog(state, 0.01)).toBe('death');
    expect(state.death).toBe('water');
  });

  test('a diving turtle group stops supporting the frog', () => {
    const state = playing();
    const lane = LANES[1];
    state.clock = 6;
    const group = obstacles(state, lane)[0];
    expect(group.submerged).toBe(true);
    expect(obstacles(state, lane)[1].submerged).toBe(false);
    state.frog = { x: group.x + lane.width / 2, row: lane.row, facing: 'UP' };
    expect(stepFrog(state, 0.01)).toBe('death');
    expect(state.death).toBe('water');
  });

  test('currents cannot wrap the frog around the screen with a log', () => {
    const state = playing();
    state.frog = { x: 469, row: 3, facing: 'UP' };
    expect(stepFrog(state, 0.01)).toBe('death');
    expect(state.death).toBe('edge');
  });

  test('each home can only be filled once, and riverbank gaps are lethal', () => {
    const state = playing();
    state.frog = { x: HOMES[2], row: 3, facing: 'UP' };
    expect(hop(state, 'UP')).toBe('home');
    expect(state.homes[2]).toBe(true);
    expect(state.score).toBe(360);
    expect(state.frog.row).toBe(14);
    state.cooldown = 0;
    state.frog = { x: HOMES[2], row: 3, facing: 'UP' };
    expect(hop(state, 'UP')).toBe('death');
    expect(state.death).toBe('home');
    const bank = playing();
    bank.frog = { x: 88, row: 3, facing: 'UP' };
    expect(hop(bank, 'UP')).toBe('death');
    expect(bank.death).toBe('home');
  });

  test('five homes award the round bonus and start a faster round', () => {
    const state = playing();
    state.homes = [true, true, false, true, true];
    state.frog = { x: HOMES[2], row: 3, facing: 'UP' };
    expect(hop(state, 'UP')).toBe('clear');
    expect(state.score).toBe(1360);
    for (let i = 0; i < 20; i++) stepFrog(state, 0.1);
    expect(state.level).toBe(2);
    expect(state.phase).toBe('playing');
    expect(state.homes).toEqual([false, false, false, false, false]);
    expect(speedScale(state.level)).toBeGreaterThan(speedScale(1));
    expect(speedScale(100)).toBe(speedScale(11));
  });

  test('timeout takes the last life and ends the run after the death animation', () => {
    const state = playing();
    state.lives = 1;
    state.remaining = 0.01;
    expect(stepFrog(state, 0.1)).toBe('death');
    expect(state.death).toBe('time');
    expect(state.lives).toBe(0);
    for (let i = 0; i < 12; i++) stepFrog(state, 0.1);
    expect(state.phase).toBe('over');
    stepFrog(state, 1);
    expect(state.lives).toBe(0);
  });

  test('20,000 points award one bonus life for the whole run', () => {
    const state = playing();
    state.score = 19995;
    hop(state, 'UP');
    expect(state.lives).toBe(4);
    expect(state.bonusLife).toBe(true);
    state.cooldown = 0;
    state.frog = { x: HOMES[2], row: 3, facing: 'UP' };
    hop(state, 'UP');
    expect(state.lives).toBe(4);
  });

  test('a saved crossing restores the same traffic and dive phases', () => {
    const original = playing();
    original.clock = 6;
    original.frog.row = 8;
    original.homes[3] = true;
    const restored = JSON.parse(JSON.stringify(original));
    expect(isFrogState(restored)).toBe(true);
    stepFrog(original, 0.05);
    stepFrog(restored, 0.05);
    expect(restored).toEqual(original);
    expect(obstacles(restored, LANES[1])).toEqual(
      obstacles(original, LANES[1]),
    );
  });

  test('rejects missing, nonfinite and out-of-bounds save fields', () => {
    expect(isFrogState(newFrog())).toBe(true);
    expect(isFrogState(null)).toBe(false);
    expect(isFrogState({ version: 1 })).toBe(false);
    expect(isFrogState({ ...newFrog(), clock: Number.NaN })).toBe(false);
    expect(isFrogState({ ...newFrog(), lives: -1 })).toBe(false);
    expect(isFrogState({ ...newFrog(), homes: [true] })).toBe(false);
    expect(isFrogState({ ...newFrog(), phase: 'clear' })).toBe(false);
    expect(
      isFrogState({ ...newFrog(), frog: { x: 200, row: 2.5, facing: 'UP' } }),
    ).toBe(false);
  });
});
