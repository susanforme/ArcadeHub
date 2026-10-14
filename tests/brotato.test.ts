import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  buyOffer,
  chooseUpgrade,
  combineWeapons,
  completeWave,
  isRun,
  lockOffer,
  newRun,
  type Run,
  recycleWeapon,
  rerollCost,
  rerollShop,
  spawnEnemy,
  startWave,
  stepRun,
  takeLoot,
  waveDuration,
} from '../src/games/brotato/logic';

function shop(): Run {
  const s = newRun('balanced', 'pistol', 123);
  startWave(s);
  completeWave(s);
  s.pending = 0;
  s.phase = 'shop';
  s.cash = 500;
  return s;
}
function advance(s: Run, seconds: number, x = 0, y = 0) {
  for (let i = 0; i < seconds * 60; i++) stepRun(s, 1 / 60, x, y);
}
describe('Brotato', () => {
  test('plugin is discoverable and supports diagonal touch movement', () => {
    const game = games.find((g) => g.id === 'brotato');
    expect(game?.virtualGamepad?.directionMode).toBe('eight-way');
    expect(game?.virtualGamepad?.buttons?.map((b) => b.id)).toEqual(['A', 'B']);
  });
  test('ready and shop do not consume wave time; diagonal movement is normalized', () => {
    const s = newRun();
    stepRun(s, 1);
    expect(s.remaining).toBe(20);
    startWave(s);
    s.spawn = 100;
    const straight = structuredClone(s),
      diagonal = structuredClone(s);
    advance(straight, 0.5, 1, 0);
    advance(diagonal, 0.5, 1, 1);
    expect(Math.hypot(straight.x - 400, straight.y - 370)).toBeCloseTo(
      Math.hypot(diagonal.x - 400, diagonal.y - 370),
    );
    completeWave(s);
    const time = s.remaining;
    stepRun(s, 0.05);
    expect(s.remaining).toBe(time);
  });
  test('waves follow the 20–60 second progression and 90 second finale', () => {
    expect([1, 2, 8, 19, 20].map(waveDuration)).toEqual([20, 25, 55, 60, 90]);
    const s = shop();
    startWave(s);
    expect(s.wave).toBe(2);
    expect(s.remaining).toBe(25);
  });
  test('auto attack kills a target without a fire button', () => {
    const s = newRun('balanced', 'pistol', 5);
    startWave(s);
    s.spawn = 100;
    spawnEnemy(s, 'chaser');
    Object.assign(s.enemies[0], {
      x: s.x + 75,
      y: s.y,
      hp: 1,
      warning: 0,
      speed: 0,
    });
    advance(s, 0.3);
    expect(s.kills).toBe(1);
    expect(s.score).toBe(10);
  });
  test('uncollected material is bagged and doubles future pickups, not immediately spent', () => {
    const s = shop();
    s.phase = 'wave';
    s.stats.harvest = 0;
    s.xp = 0;
    s.cash = 0;
    s.drops = [{ id: s.serial++, kind: 'material', x: 50, y: 150, value: 4 }];
    completeWave(s);
    expect(s.bag).toBe(4);
    expect(s.cash).toBe(0);
    startWave(s);
    s.spawn = 100;
    s.drops = [{ id: s.serial++, kind: 'material', x: s.x, y: s.y, value: 2 }];
    stepRun(s, 0.01);
    expect(s.cash).toBe(4);
    expect(s.bag).toBe(2);
    expect(s.xp).toBe(4);
  });
  test('experience defers upgrade choices until wave end; choosing consumes one level', () => {
    const s = newRun();
    startWave(s);
    s.spawn = 100;
    s.drops = [{ id: s.serial++, kind: 'material', x: s.x, y: s.y, value: 20 }];
    stepRun(s, 0.01);
    expect(s.level).toBe(2);
    expect(s.phase).toBe('wave');
    completeWave(s);
    expect(s.phase).toBe('upgrade');
    expect(s.upgrades).toHaveLength(4);
    const { stat, value } = s.upgrades[0],
      before = s.stats[stat];
    chooseUpgrade(s, 0);
    expect(s.stats[stat]).toBe(before + value);
    expect(s.pending).toBe(0);
    expect(s.phase).toBe('shop');
  });
  test('shop lock retains the exact card and price across rerolls and waves', () => {
    const s = shop();
    const original = { ...s.offers[0], locked: true };
    lockOffer(s, 0);
    const cash = s.cash,
      cost = rerollCost(s);
    expect(rerollShop(s)).toBe(true);
    expect(s.cash).toBe(cash - cost);
    expect(s.offers[0]).toEqual(original);
    startWave(s);
    completeWave(s);
    while (s.phase === 'upgrade') chooseUpgrade(s, 0);
    expect(s.offers[0]).toEqual(original);
  });
  test('duplicate purchases fill free slots before combining; early shops guarantee two weapons', () => {
    const s = shop();
    expect(s.offers.filter((o) => o?.kind === 'weapon')).toHaveLength(2);
    s.offers[0] = {
      kind: 'weapon',
      key: 'pistol',
      tier: 1,
      price: 20,
      locked: false,
    };
    expect(buyOffer(s, 0)).toBe(true);
    expect(s.weapons).toHaveLength(2);
    expect(s.weapons.map((w) => w.tier)).toEqual([1, 1]);
    s.offers = [
      { kind: 'item', key: 'heart', tier: 1, price: 20, locked: true },
      { kind: 'item', key: 'coffee', tier: 1, price: 20, locked: true },
      null,
      null,
    ];
    rerollShop(s);
    expect(s.offers.filter((o) => o?.kind === 'weapon')).toHaveLength(2);
    expect(s.offers[0]?.key).toBe('heart');
    expect(s.offers[1]?.key).toBe('coffee');
  });
  test('emptying the shop restocks for free without changing the reroll counter', () => {
    const s = shop();
    s.offers = [
      { kind: 'item', key: 'boots', tier: 1, price: 20, locked: false },
      null,
      null,
      null,
    ];
    expect(buyOffer(s, 0)).toBe(true);
    expect(s.cash).toBe(480);
    expect(s.rerolls).toBe(0);
    expect(s.offers.filter(Boolean)).toHaveLength(4);
    expect(
      new Set(
        s.offers.map((o) =>
          o?.kind === 'weapon' ? `${o.key}-${o.tier}` : o?.key,
        ),
      ).size,
    ).toBe(4);
  });
  test('six slots block a new weapon but allow matching-tier purchase to combine', () => {
    const s = shop();
    for (let i = 0; i < 5; i++)
      s.weapons.push({
        id: s.serial++,
        kind: 'knife',
        tier: 1,
        cooldown: 0,
        angle: 0,
        flash: 0,
      });
    s.offers[0] = {
      kind: 'weapon',
      key: 'smg',
      tier: 1,
      price: 20,
      locked: false,
    };
    expect(buyOffer(s, 0)).toBe(false);
    expect(s.cash).toBe(500);
    s.offers[0] = {
      kind: 'weapon',
      key: 'pistol',
      tier: 1,
      price: 20,
      locked: false,
    };
    expect(buyOffer(s, 0)).toBe(true);
    expect(s.weapons).toHaveLength(6);
    expect(s.weapons[0].tier).toBe(2);
  });
  test('tier IV cannot combine; recycling cannot remove the last weapon', () => {
    const s = shop();
    expect(recycleWeapon(s, 0)).toBe(false);
    s.weapons.push({ ...s.weapons[0], id: s.serial++ });
    expect(combineWeapons(s, 0)).toBe(true);
    expect(s.weapons).toHaveLength(1);
    expect(s.weapons[0].tier).toBe(2);
    s.weapons[0].tier = 4;
    s.weapons.push({ ...s.weapons[0], id: s.serial++ });
    expect(combineWeapons(s, 0)).toBe(false);
    const cash = s.cash;
    expect(recycleWeapon(s, 1)).toBe(true);
    expect(s.cash).toBeGreaterThan(cash);
  });
  test('items apply both their bonus and downside; crate can be recycled', () => {
    const s = shop();
    s.offers[0] = {
      kind: 'item',
      key: 'coffee',
      tier: 2,
      price: 20,
      locked: false,
    };
    expect(buyOffer(s, 0)).toBe(true);
    expect(s.stats.attackSpeed).toBe(24);
    expect(s.stats.damage).toBe(-1);
    s.loot = ['heart'];
    s.phase = 'loot';
    const hp = s.stats.maxHp,
      cash = s.cash;
    expect(takeLoot(s, true)).toBe(true);
    expect(s.stats.maxHp).toBe(hp);
    expect(s.cash).toBe(cash + 10);
  });
  test('contact damage has invulnerability and armor; lethal damage ends the run', () => {
    const s = newRun();
    startWave(s);
    s.spawn = 100;
    s.invincible = 0;
    s.hp = 1;
    spawnEnemy(s, 'tank');
    Object.assign(s.enemies[0], {
      x: s.x,
      y: s.y,
      warning: 0,
      speed: 0,
      damage: 100,
    });
    stepRun(s, 0.01);
    expect(s.phase).toBe('dead');
    expect(s.hp).toBe(0);
    const time = s.remaining;
    stepRun(s, 0.01);
    expect(s.remaining).toBe(time);
  });
  test('negative armor amplifies damage and invulnerability prevents repeated contact hits', () => {
    for (const [armor, expected] of [
      [5, 8],
      [-5, 13],
    ]) {
      const s = newRun();
      startWave(s);
      s.spawn = 100;
      s.invincible = 0;
      s.hp = s.stats.maxHp = 100;
      s.stats.armor = armor;
      spawnEnemy(s, 'tank');
      Object.assign(s.enemies[0], {
        x: s.x,
        y: s.y,
        warning: 0,
        speed: 0,
        damage: 10,
        hp: 10000,
      });
      stepRun(s, 0.01);
      expect(s.hp).toBe(100 - expected);
      stepRun(s, 0.01);
      expect(s.hp).toBe(100 - expected);
    }
  });
  test('final boss is present and its defeat or surviving the timer wins', () => {
    const s = shop();
    s.wave = 19;
    startWave(s);
    expect(s.enemies.filter((e) => e.kind === 'boss')).toHaveLength(1);
    s.enemies = [];
    s.spawn = 100;
    stepRun(s, 0.01);
    expect(s.phase).toBe('won');
    const timer = shop();
    timer.wave = 19;
    startWave(timer);
    timer.remaining = 0.01;
    timer.invincible = 100;
    stepRun(timer, 0.02);
    expect(timer.phase).toBe('won');
  });
  test('snapshots round-trip battle and shop; malformed entities are rejected', () => {
    const s = newRun();
    expect(isRun(JSON.parse(JSON.stringify(s)))).toBe(true);
    startWave(s);
    advance(s, 5, 1, 0);
    expect(isRun(structuredClone(s))).toBe(true);
    const saved = structuredClone(s);
    advance(s, 1, -1, 0);
    advance(saved, 1, -1, 0);
    expect(saved).toEqual(s);
    expect(isRun(shop())).toBe(true);
    expect(isRun({ ...s, weapons: [] })).toBe(false);
    expect(isRun({ ...s, stats: { ...s.stats, ranged: NaN } })).toBe(false);
    expect(isRun({ ...s, enemies: [{ id: 1 }] })).toBe(false);
    expect(isRun({ ...s, version: 0 })).toBe(false);
  });
});
