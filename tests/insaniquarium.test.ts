import { describe, expect, test } from '@rstest/core';
import {
  eggCost,
  isAquariumState,
  newAquariumState,
  stepAquarium,
  tankAction,
  tapTank,
} from '../src/games/insaniquarium/logic';

describe('insaniquarium', () => {
  test('purchases charge once and reject unaffordable upgrades', () => {
    const s = newAquariumState();
    expect(tankAction(s, 'food')).toBe(false);
    expect(tankAction(s, 'fish')).toBe(true);
    expect(s.money).toBe(80);
    expect(s.fish).toHaveLength(3);
    expect(tankAction(s, 'fish')).toBe(false);
  });
  test('feeding grows hungry fish while collecting coins pays their value', () => {
    const s = newAquariumState();
    s.fish[0].hunger = 20;
    const f = s.fish[0];
    tapTank(s, f.x, f.y);
    stepAquarium(s, 0.01);
    expect(f.growth).toBe(1);
    expect(f.hunger).toBeGreaterThan(50);
    expect(s.food).toHaveLength(0);
    s.coins.push({ id: s.nextId++, x: 300, y: 300, value: 75 });
    tapTank(s, 300, 300);
    expect(s.money).toBe(250);
    expect(s.score).toBe(75);
  });
  test('invasions attack fish and lasers defeat monsters', () => {
    const s = newAquariumState();
    s.invasion = 0.001;
    stepAquarium(s, 0.01);
    expect(s.monster?.hp).toBe(16);
    s.monster = { x: 300, y: 300, hp: 1, bite: 3 };
    expect(tapTank(s, 300, 300)).toBe('laser');
    expect(s.monster).toBe(null);
    expect(s.coins[0].value).toBe(150);
  });
  test('egg progression and snapshots enforce limits', () => {
    const s = newAquariumState();
    s.money = 1000;
    expect(eggCost(s)).toBe(400);
    tankAction(s, 'egg');
    expect(eggCost(s)).toBe(600);
    expect(isAquariumState(s)).toBe(true);
    expect(isAquariumState({ ...s, money: -1 })).toBe(false);
    expect(isAquariumState({ ...s, food: [null] })).toBe(false);
    expect(isAquariumState({ ...s, eggs: 3 })).toBe(false);
  });
});
