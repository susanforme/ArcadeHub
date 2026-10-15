import { describe, expect, test } from '@rstest/core';
import {
  BASE,
  isIceState,
  newIce,
  stepIce,
} from '../src/games/ice-climber/logic';

describe('Ice Climber', () => {
  test('starts on input and can join local co-op', () => {
    const s = newIce();
    stepIce(s, [{}]);
    expect(s.ticks).toBe(0);
    stepIce(s, [{ join: true }]);
    expect(s.players).toHaveLength(2);
    stepIce(s, [{ jump: true }]);
    expect(s.phase).toBe('playing');
    expect(s.players[0].vy).toBeLessThan(0);
  });
  test('jump breaks overhead ice and can land on the next floor', () => {
    const s = newIce();
    s.enemies.forEach((e) => {
      e.alive = false;
    });
    s.players[0].x = 210;
    stepIce(s, [{ jump: true }]);
    let broken = false;
    for (let i = 0; i < 80; i++) {
      stepIce(s, [{ right: i > 15 && i < 35 }]);
      if (s.floors[1][7] === 0) broken = true;
    }
    expect(broken).toBe(true);
    expect(s.players[0].checkpoint).toBeGreaterThanOrEqual(1);
    expect(s.score).toBeGreaterThan(0);
  });
  test('every adjacent ice floor is reachable with the actual jump physics', () => {
    for (let level = 1; level <= 8; level++) {
      for (let floor = 0; floor < 14; floor++) {
        let reached = false;
        for (const direction of [-1, 1]) {
          const s = newIce(level);
          s.enemies.forEach((e) => {
            e.alive = false;
          });
          const p = s.players[0];
          p.y = BASE - floor * 100;
          p.checkpoint = floor;
          s.camera = Math.max(200, p.y - 500);
          stepIce(s, [{ jump: true }]);
          for (let i = 0; i < 80; i++) {
            stepIce(s, [
              {
                right: direction === 1 && i > 15 && i < 35,
                left: direction === -1 && i > 15 && i < 35,
              },
            ]);
            if (p.checkpoint > floor) reached = true;
          }
        }
        expect(reached).toBe(true);
      }
    }
  });
  test('hammer defeats an enemy only in front', () => {
    const s = newIce();
    s.players[0].x = 200;
    s.enemies[0] = { x: 230, y: BASE, dir: -1, floor: 1, alive: true };
    stepIce(s, [{ hit: true }]);
    expect(s.enemies[0].alive).toBe(false);
    expect(s.score).toBe(400);
  });
  test('damage and screen falls have a finite shared life pool', () => {
    const s = newIce();
    s.phase = 'playing';
    s.lives = 1;
    s.players[0].invincible = 0;
    s.players[0].y = 1990;
    stepIce(s, [{}]);
    expect(s.phase).toBe('over');
    expect(isIceState(s)).toBe(false);
  });
  test('summit advances to a harder mountain and preserves co-op', () => {
    const s = newIce(1, 0, 3, 2);
    s.players[0].checkpoint = 14;
    s.players[0].y = BASE - 1400;
    s.camera = 250;
    stepIce(s, [{ start: true }]);
    expect(s.phase).toBe('clear');
    for (let i = 0; i < 120; i++) stepIce(s, [{}]);
    expect(s.level).toBe(2);
    expect(s.players).toHaveLength(2);
    expect(s.score).toBeGreaterThanOrEqual(3000);
  });
  test('validates saved state and deterministic resume including clouds', () => {
    const s = newIce();
    for (let i = 0; i < 180; i++)
      stepIce(s, [
        { jump: i % 45 === 0, right: i % 100 < 50, left: i % 100 >= 50 },
      ]);
    expect(isIceState(s)).toBe(true);
    const restored = JSON.parse(JSON.stringify(s));
    for (let i = 0; i < 30; i++) {
      stepIce(s, [{ right: true }]);
      stepIce(restored, [{ right: true }]);
    }
    expect(restored).toEqual(s);
    expect(isIceState({ ...s, players: [] })).toBe(false);
    expect(isIceState({ ...s, camera: Infinity })).toBe(false);
  });
});
