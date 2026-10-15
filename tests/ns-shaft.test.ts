import { describe, expect, test } from '@rstest/core';
import {
  CEILING,
  isShaftState,
  newShaft,
  stepShaft,
} from '../src/games/ns-shaft/logic';

describe('NS-SHAFT', () => {
  test('waits for input, carries the player with the floor and resumes its seed', () => {
    const ready = newShaft(17);
    expect(stepShaft(ready, 0.1, 0).state).toBe(ready);
    const running = stepShaft(ready, 0.1, 0, true).state;
    expect(running.y).toBeLessThan(ready.y);
    expect(running.health).toBe(10);
    expect(ready.y).toBe(210);
    const saved = JSON.parse(JSON.stringify(running));
    expect(isShaftState(saved)).toBe(true);
    expect(stepShaft(saved, 0.1, 1).state).toEqual(
      stepShaft(running, 0.1, 1).state,
    );
  });

  test('spikes damage once per floor and ordinary landings restore one life', () => {
    const ready = newShaft(7);
    ready.phase = 'playing';
    ready.grounded = null;
    ready.y = 209;
    ready.velocity = 80;
    ready.floors[0].kind = 'nails';
    ready.floors[0].touched = false;
    const hit = stepShaft(ready, 0.05, 0).state;
    expect(hit.health).toBe(7);
    expect(stepShaft(hit, 0.05, 0).state.health).toBe(7);
    ready.health = 6;
    ready.floors[0].kind = 'normal';
    expect(stepShaft(ready, 0.05, 0).state.health).toBe(7);
  });

  test('springs launch upward and flip floors cease supporting the player', () => {
    const ready = newShaft(9);
    ready.phase = 'playing';
    ready.grounded = null;
    ready.y = 209;
    ready.velocity = 80;
    ready.floors[0].kind = 'spring';
    const bounced = stepShaft(ready, 0.05, 0).state;
    expect(bounced.velocity).toBeLessThan(0);
    expect(bounced.grounded).toBe(null);
    ready.floors[0].kind = 'flip';
    let flipped = stepShaft(ready, 0.05, 0).state;
    flipped = stepShaft(flipped, 0.1, 0).state;
    flipped = stepShaft(flipped, 0.1, 0).state;
    expect(flipped.grounded).toBe(null);
    expect(flipped.velocity).toBeGreaterThan(0);
  });

  test('ceiling damage has a cooldown and malformed saves are rejected', () => {
    const state = newShaft(1);
    state.phase = 'playing';
    state.grounded = null;
    state.y = CEILING + 20;
    state.velocity = -100;
    const hit = stepShaft(state, 0.01, 0).state;
    expect(hit.health).toBe(7);
    hit.y = CEILING + 20;
    expect(stepShaft(hit, 0.01, 0).state.health).toBe(7);
    expect(isShaftState({ ...state, health: Number.NaN })).toBe(false);
    expect(
      isShaftState({ ...state, floors: [state.floors[0], state.floors[0]] }),
    ).toBe(false);
  });
});
