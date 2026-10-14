import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  buy,
  finishDay,
  isMinerState,
  type Mineral,
  type MinerState,
  newMiner,
  nextLevel,
  ORIGIN,
  REST,
  stepMiner,
} from '../src/games/gold-miner/logic';

const gold: Mineral = {
  id: 0,
  kind: 'gold',
  x: ORIGIN.x,
  y: 280,
  radius: 24,
  value: 250,
  weight: 2.3,
};
function mining(): MinerState {
  const state = newMiner(() => 0.5);
  stepMiner(state, 0, true);
  state.angle = 0;
  state.minerals = [{ ...gold }];
  return state;
}
function advance(state: MinerState, seconds: number) {
  for (let i = 0; i < seconds * 120; i++) stepMiner(state, 1 / 120);
}
describe('Gold Miner', () => {
  test('is discovered with keyboard and virtual A/B controls', () => {
    const manifest = games.find((g) => g.id === 'gold-miner');
    expect(manifest?.virtualGamepad?.buttons?.map((b) => b.action)).toEqual([
      'DROP',
      'UP',
    ]);
  });
  test('ready screen does not spend time and launch locks the angle', () => {
    const s = newMiner();
    stepMiner(s, 10);
    expect(s.remaining).toBe(60);
    stepMiner(s, 0, true);
    stepMiner(s, 0.1, true);
    const angle = s.angle;
    stepMiner(s, 0.1, true);
    expect(s.angle).toBe(angle);
    expect(s.length).toBeGreaterThan(REST);
  });
  test('catches the closest object and only pays once it reaches the miner', () => {
    const s = mining();
    s.minerals.push({ ...gold, id: 1, y: 400 });
    stepMiner(s, 0, true);
    advance(s, 0.5);
    expect(s.cargo?.id).toBe(0);
    expect(s.cash).toBe(0);
    advance(s, 2);
    expect(s.cash).toBe(250);
    expect(s.score).toBe(250);
    expect(s.cargo).toBeNull();
    expect(s.minerals.map((m) => m.id)).toEqual([1]);
    advance(s, 2);
    expect(s.cash).toBe(250);
  });
  test('diamonds are hauled faster than heavy rocks, and strength boosts hauling', () => {
    const hauling = (weight: number, strength = false) => {
      const s = mining();
      s.hook = 'back';
      s.length = 300;
      s.cargo = { ...gold, weight };
      s.minerals = [];
      s.strength = strength;
      stepMiner(s, 0.1);
      return s.length;
    };
    expect(hauling(0.8)).toBeLessThan(hauling(5));
    expect(hauling(5, true)).toBeLessThan(hauling(5));
  });
  test('dynamite consumes one charge only with cargo and never awards cash', () => {
    const s = mining();
    stepMiner(s, 0, false, true);
    expect(s.dynamite).toBe(1);
    s.hook = 'back';
    s.length = 300;
    s.cargo = { ...gold };
    s.minerals = [];
    expect(stepMiner(s, 0, false, true)).toContain('blast');
    expect(s.dynamite).toBe(0);
    expect(s.cargo).toBeNull();
    expect(s.cash).toBe(0);
    s.cargo = { ...gold };
    stepMiner(s, 0, false, true);
    expect(s.cargo).not.toBeNull();
  });
  test('missed hooks retract and simulation is consistent across frame rates', () => {
    const a = mining(),
      b = mining();
    a.minerals = [];
    b.minerals = [];
    stepMiner(a, 0, true);
    stepMiner(b, 0, true);
    for (let i = 0; i < 45; i++) stepMiner(a, 1 / 30);
    for (let i = 0; i < 180; i++) stepMiner(b, 1 / 120);
    expect(a.hook).toBe('back');
    expect(a.length).toBeCloseTo(b.length, 5);
    advance(a, 2);
    expect(a.phase).toBe('over');
    expect(a.cash).toBe(0);
  });
  test('timeout fails below goal and opens shop at goal; unfinished cargo is not paid', () => {
    const fail = mining();
    fail.remaining = 0.01;
    fail.cash = 649;
    stepMiner(fail, 0.1);
    expect(fail.phase).toBe('over');
    const pass = mining();
    pass.cash = 650;
    pass.score = 650;
    pass.remaining = 0.01;
    pass.hook = 'back';
    pass.length = 300;
    pass.cargo = { ...gold };
    stepMiner(pass, 0.1);
    expect(pass.phase).toBe('shop');
    expect(pass.cash).toBe(650);
  });
  test('shop spends cash without changing score; upgrades expire after one level', () => {
    const s = mining();
    s.cash = 1500;
    s.score = 1500;
    expect(finishDay(s)).toBe(true);
    expect(buy(s, 'strength')).toBe(true);
    expect(buy(s, 'strength')).toBe(false);
    expect(buy(s, 'polish')).toBe(true);
    expect(buy(s, 'dynamite')).toBe(true);
    expect(s.cash).toBe(760);
    expect(s.score).toBe(1500);
    nextLevel(s, () => 0.5);
    expect(s.level).toBe(2);
    expect(s.target).toBe(1450);
    expect(s.remaining).toBe(60);
    expect(s.strength).toBe(true);
    expect(s.polish).toBe(true);
    expect(s.dynamite).toBe(2);
    expect(buy(s, 'dynamite')).toBe(false);
    s.remaining = 0.01;
    s.cash = 1450;
    stepMiner(s, 0.1);
    expect(s.strength).toBe(false);
    expect(s.polish).toBe(false);
  });
  test('diamond polish increases actual revenue, and unaffordable items are rejected', () => {
    const s = mining();
    s.polish = true;
    s.hook = 'back';
    s.length = REST + 1;
    s.cargo = { ...gold, kind: 'diamond', value: 600 };
    s.minerals = [];
    stepMiner(s, 0.1);
    expect(s.cash).toBe(900);
    expect(s.score).toBe(900);
    s.cash = 100;
    expect(buy(s, 'dynamite')).toBe(false);
    expect(s.cash).toBe(100);
  });
  test('fields have separated objects and sufficient revenue through later levels', () => {
    let seed = 71;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const s = newMiner(random);
    for (let level = 1; level <= 30; level++) {
      expect(s.minerals.reduce((sum, m) => sum + m.value, 0)).toBeGreaterThan(
        2200,
      );
      for (const a of s.minerals)
        for (const b of s.minerals)
          if (a.id !== b.id)
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(
              a.radius + b.radius,
            );
      expect(isMinerState(s)).toBe(true);
      s.phase = 'shop';
      nextLevel(s, random);
    }
  });
  test('restores valid snapshots and rejects malformed or inconsistent saves', () => {
    const s = mining();
    stepMiner(s, 0.1, true);
    expect(isMinerState(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(isMinerState(null)).toBe(false);
    for (const patch of [
      { version: 2 },
      { remaining: NaN },
      { phase: 'over' },
      { dynamite: -1 },
      { angle: 9 },
      { score: -1 },
      { minerals: [null] },
      { remaining: 0 },
    ])
      expect(isMinerState({ ...s, ...patch })).toBe(false);
    expect(isMinerState({ ...s, minerals: [gold, gold] })).toBe(false);
    expect(isMinerState({ ...s, hook: 'swing', length: 100 })).toBe(false);
  });
});
