import { readFileSync } from 'node:fs';
import { describe, expect, test } from '@rstest/core';
import frames from '../src/games/metal-slug/assets/frames.json';
import {
  enemySize,
  GROUND,
  isSlugState,
  LEVEL_LENGTH,
  newMission,
  type SlugInput,
  type SlugState,
  stepSlug,
} from '../src/games/metal-slug/logic';

const idle: SlugInput = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  fire: false,
  grenade: false,
};
function run(state: SlugState, count: number, input = idle) {
  for (let i = 0; i < count; i++) stepSlug(state, input);
}
function quiet(level = 1) {
  const s = newMission(level);
  s.phase = 'playing';
  for (const e of s.enemies) if (!e.kind.startsWith('boss')) e.hp = 0;
  return s;
}
describe('Metal Slug migration', () => {
  test('Unity frame extraction stays inside the shipped atlas and includes complete boss sprites', () => {
    const png = readFileSync('src/games/metal-slug/assets/actors.png');
    const width = png.readUInt32BE(16),
      height = png.readUInt32BE(20);
    for (const [x, y, w, h] of Object.values(frames)) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
      expect(x + w).toBeLessThanOrEqual(width);
      expect(y + h).toBeLessThanOrEqual(height);
    }
    for (const prefix of [
      'boss1/hugeermit_idle_',
      'boss2/ufo_attack_',
      'boss3/Neo Geo NGCD - Metal Slug 3 - Sol Dae Rokker_35',
    ]) {
      const complete = Object.entries(frames).filter(([name]) =>
        name.startsWith(prefix),
      );
      expect(complete.length).toBeGreaterThan(0);
      for (const [, frame] of complete)
        expect(frame[3]).toBeGreaterThanOrEqual(100);
    }
  });
  test('waits for input; movement, jump, landing and crouch use fixed simulation steps', () => {
    const s = newMission();
    run(s, 60);
    expect(s.time).toBe(0);
    stepSlug(s, { ...idle, right: true, jump: true });
    expect(s.phase).toBe('playing');
    expect(s.player.x).toBeGreaterThan(90);
    expect(s.player.y).toBeLessThan(GROUND);
    run(s, 60);
    expect(s.player.y).toBe(GROUND);
    stepSlug(s, { ...idle, down: true, jump: true });
    expect(s.player.y).toBe(GROUND);
    expect(s.player.crouch).toBe(true);
    expect(isSlugState(s)).toBe(true);
  });
  test('lands on raised platforms and can jump off', () => {
    const s = quiet();
    s.player.x = 740;
    stepSlug(s, { ...idle, jump: true });
    run(s, 35);
    expect(s.player.y).toBe(240);
    stepSlug(s, { ...idle, jump: true });
    expect(s.player.y).toBeLessThan(240);
  });
  test('pistol hits, melee deals 200 damage, and heavy gun consumes finite ammo', () => {
    const s = newMission();
    s.phase = 'playing';
    s.enemies[0].x = 210;
    stepSlug(s, { ...idle, fire: true });
    run(s, 12);
    expect(s.enemies[0].hp).toBe(25);
    s.player.cooldown = 0;
    s.enemies[0].x = s.player.x + 40;
    stepSlug(s, { ...idle, fire: true });
    expect(s.enemies[0].hp).toBe(0);
    expect(s.score).toBe(100);
    s.player.ammo = 2;
    s.player.cooldown = 0;
    stepSlug(s, { ...idle, fire: true });
    expect(s.player.ammo).toBe(1);
    run(s, 8, { ...idle, fire: true });
    expect(s.player.ammo).toBe(0);
    expect(isSlugState(s)).toBe(true);
  });
  test('aiming up can hit aerial enemies and crouching avoids high shots', () => {
    const s = quiet(2);
    const boss = s.enemies[15];
    s.player.x = boss.x;
    s.player.invulnerable = 1;
    stepSlug(s, { ...idle, up: true, fire: true });
    run(s, 8);
    expect(boss.hp).toBeLessThan(boss.maxHp);
    const crouch = quiet();
    crouch.projectiles.push({
      id: crouch.nextId++,
      kind: 'enemy',
      x: crouch.player.x,
      y: GROUND - 45,
      vx: 0,
      vy: 0,
      ttl: 1,
      damage: 10,
    });
    stepSlug(crouch, { ...idle, down: true });
    expect(crouch.player.hp).toBe(100);
    stepSlug(crouch, idle);
    expect(crouch.player.hp).toBe(90);
  });
  test('grenades explode once, deal area damage and cannot exceed available inventory', () => {
    const s = newMission();
    s.enemies[0].x = 280;
    s.enemies[1].x = 300;
    s.player.grenades = 1;
    stepSlug(s, { ...idle, grenade: true, right: true });
    run(s, 70);
    expect(s.player.grenades).toBe(0);
    expect(s.enemies[0].hp).toBe(0);
    expect(s.enemies[1].hp).toBe(0);
    expect(s.projectiles.some((v) => v.kind === 'grenade')).toBe(false);
    stepSlug(s, { ...idle, grenade: true });
    expect(s.player.grenades).toBe(0);
  });
  test('pickups are one-shot; healing is capped and score persists between three missions', () => {
    const s = quiet();
    s.player.x = 900;
    stepSlug(s, idle);
    expect(s.player.ammo).toBe(120);
    stepSlug(s, idle);
    expect(s.player.ammo).toBe(120);
    s.player.x = 2000;
    s.player.hp = 95;
    stepSlug(s, idle);
    expect(s.player.hp).toBe(100);
    s.enemies[15].hp = 0;
    stepSlug(s, idle);
    expect(s.phase).toBe('clear');
    expect(isSlugState(s)).toBe(true);
    run(s, 151);
    expect(s.level).toBe(2);
    expect(s.score).toBe(200);
    for (const level of [2, 3]) {
      expect(s.level).toBe(level);
      s.enemies[15].hp = 0;
      stepSlug(s, idle);
      run(s, 151);
    }
    expect(s.phase).toBe('won');
    expect(isSlugState(s)).toBe(false);
  });
  test('bosses have distinct attacks, lock the arena and stop completely on death', () => {
    for (const level of [1, 2, 3]) {
      const s = quiet(level);
      s.player.x = LEVEL_LENGTH - 500;
      s.enemies[15].cooldown = 0;
      stepSlug(s, { ...idle, left: true });
      expect(s.player.x).toBeGreaterThanOrEqual(LEVEL_LENGTH - 640);
      expect(s.projectiles).toHaveLength(level === 3 ? 3 : 1);
      expect(s.projectiles[0].kind).toBe(level === 2 ? 'rock' : 'enemy');
      expect(enemySize(s.enemies[15].kind).h).toBeGreaterThan(100);
      s.player.hp = 10;
      s.player.invulnerable = 0;
      s.projectiles.push({
        id: s.nextId++,
        kind: 'enemy',
        x: s.player.x,
        y: s.player.y - 10,
        vx: 0,
        vy: 0,
        ttl: 1,
        damage: 25,
      });
      expect(stepSlug(s, idle)).toContain('death');
      expect(s.phase).toBe('over');
      const snapshot = structuredClone(s);
      run(s, 60, { ...idle, fire: true });
      expect(s).toEqual(snapshot);
    }
  });
  test('full snapshots round trip deterministically, including live projectiles and cooldowns', () => {
    const s = quiet();
    s.player.x = 900;
    run(s, 30, { ...idle, right: true, fire: true });
    expect(isSlugState(s)).toBe(true);
    const restored = JSON.parse(JSON.stringify(s)) as SlugState;
    run(s, 60, { ...idle, right: true, fire: true });
    run(restored, 60, { ...idle, right: true, fire: true });
    expect(restored).toEqual(s);
  });
  test('rejects malformed saves, invalid IDs, non-finite values and finished runs', () => {
    const s = newMission();
    expect(isSlugState(s)).toBe(true);
    for (const value of [
      null,
      {},
      { ...s, level: 4 },
      { ...s, phase: 'won' },
      { ...s, player: { ...s.player, hp: NaN } },
      { ...s, nextId: 2 },
      { ...s, enemies: [null, ...s.enemies.slice(1)] },
      { ...s, projectiles: [null] },
      { ...s, pickups: [null, ...s.pickups.slice(1)] },
    ])
      expect(isSlugState(value)).toBe(false);
  });
});
