import { describe, expect, test } from '@rstest/core';
import {
  BUMPERS,
  isPinballState,
  launchBall,
  newPinball,
  stepPinball,
  TARGETS,
} from '../src/games/pinball/logic';

const idle = { left: false, right: false };
describe('Classic Pinball', () => {
  test('launch leaves the shooter lane and keeps a valid state', () => {
    const s = newPinball();
    expect(launchBall(s)).toBe(true);
    expect(launchBall(s)).toBe(false);
    let reached = false;
    for (let i = 0; i < 25; i++) {
      stepPinball(s, 0.05, idle);
      if (s.x < 380) reached = true;
      expect(isPinballState(s)).toBe(true);
    }
    expect(reached).toBe(true);
  });
  test('high speed balls bounce off thin rails instead of tunneling', () => {
    const s = newPinball();
    s.phase = 'playing';
    s.x = 55;
    s.y = 380;
    s.vx = -1200;
    s.vy = 0;
    stepPinball(s, 0.05, idle);
    expect(s.x).toBeGreaterThanOrEqual(44);
    expect(s.vx).toBeGreaterThan(0);
  });
  test('held flipper returns a falling ball upward', () => {
    const s = newPinball();
    s.phase = 'playing';
    s.left = -0.52;
    s.x = 180;
    s.y = 547;
    s.vy = 300;
    stepPinball(s, 0.08, { left: true, right: false });
    expect(s.vy).toBeLessThan(-400);
  });
  test('bumper scores on contact and has a repeat cooldown', () => {
    const s = newPinball();
    s.phase = 'playing';
    s.x = BUMPERS[0].x;
    s.y = BUMPERS[0].y - 39;
    s.vy = 100;
    stepPinball(s, 0.001, idle);
    expect(s.score).toBe(100);
    s.x = BUMPERS[0].x;
    s.y = BUMPERS[0].y - 39;
    stepPinball(s, 0.001, idle);
    expect(s.score).toBe(100);
  });
  test('all targets award a bonus and activate double scoring', () => {
    const s = newPinball();
    s.phase = 'playing';
    for (const b of TARGETS) {
      s.x = b.x;
      s.y = b.y + 24;
      s.vy = -100;
      s.vx = 0;
      stepPinball(s, 0.001, idle);
    }
    expect(s.score).toBe(1750);
    expect(s.bonus).toBeGreaterThan(14);
    expect(s.lit).toEqual([false, false, false]);
  });
  test('three drains exhaust the balls and stop the session', () => {
    const s = newPinball();
    for (let i = 0; i < 3; i++) {
      launchBall(s);
      s.x = 240;
      s.y = 699;
      s.vy = 500;
      stepPinball(s, 0.01, idle);
      expect(s.balls).toBe(2 - i);
    }
    expect(s.phase).toBe('over');
    expect(launchBall(s)).toBe(false);
  });
  test('an unattended ball drains instead of getting trapped under a slingshot', () => {
    const s = newPinball();
    for (let i = 0; i < 12000 && s.phase !== 'over'; i++) {
      launchBall(s);
      stepPinball(s, 1 / 60, idle);
    }
    expect(s.phase).toBe('over');
    expect(s.balls).toBe(0);
  });
  test('alternating flippers cannot strand the ball between the slingshot and wall', () => {
    const s = newPinball();
    let stillFrames = 0;
    for (let i = 0; i < 12000 && s.phase !== 'over'; i++) {
      launchBall(s);
      const x = s.x,
        y = s.y;
      stepPinball(s, 1 / 60, { left: i % 75 < 30, right: i % 101 < 35 });
      stillFrames = Math.hypot(s.x - x, s.y - y) < 0.1 ? stillFrames + 1 : 0;
      expect(stillFrames, JSON.stringify(s)).toBeLessThan(120);
      if (s.phase !== 'over') expect(isPinballState(s)).toBe(true);
    }
  });
  test('a ball falling back into the shooter lane can be launched again', () => {
    const s = newPinball();
    launchBall(s);
    s.x = 425;
    s.y = 632;
    s.vy = 100;
    stepPinball(s, 0.1, idle);
    expect(s.phase).toBe('ready');
    expect(s.balls).toBe(3);
    expect(launchBall(s)).toBe(true);
  });
  test('JSON snapshot continues the same physics and rejects corrupt saves', () => {
    const s = newPinball();
    launchBall(s);
    stepPinball(s, 0.1, idle);
    const c = JSON.parse(JSON.stringify(s));
    expect(isPinballState(c)).toBe(true);
    stepPinball(s, 0.1, idle);
    stepPinball(c, 0.1, idle);
    expect(c).toEqual(s);
    expect(isPinballState({ ...s, vx: NaN })).toBe(false);
    expect(isPinballState({ ...s, balls: 99 })).toBe(false);
    expect(isPinballState({ ...s, cooldowns: [0] })).toBe(false);
  });
});
