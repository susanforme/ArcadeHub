export interface TankFish {
  id: number;
  x: number;
  y: number;
  direction: number;
  hunger: number;
  growth: number;
  coin: number;
}
export interface Drop {
  id: number;
  x: number;
  y: number;
  value: number;
}
export interface AquariumState {
  version: 1;
  level: number;
  money: number;
  eggs: number;
  foodLevel: number;
  laserLevel: number;
  nextId: number;
  invasion: number;
  monster: { x: number; y: number; hp: number; bite: number } | null;
  fish: TankFish[];
  food: Drop[];
  coins: Drop[];
  score: number;
}
export const newAquariumState = (level = 1): AquariumState => ({
  version: 1,
  level,
  money: 180,
  eggs: 0,
  foodLevel: 1,
  laserLevel: 1,
  nextId: 3,
  invasion: 40,
  monster: null,
  fish: [1, 2].map((id) => ({
    id,
    x: 180 + id * 70,
    y: 300 + id * 60,
    direction: id === 1 ? 1 : -1,
    hunger: 80,
    growth: 0,
    coin: 8,
  })),
  food: [],
  coins: [],
  score: 0,
});
export const eggCost = (s: AquariumState) =>
  400 + s.eggs * 200 + (s.level - 1) * 100;
export function tankAction(
  s: AquariumState,
  action: 'fish' | 'food' | 'laser' | 'egg',
) {
  const cost =
    action === 'fish'
      ? 100
      : action === 'food'
        ? s.foodLevel * 200
        : action === 'laser'
          ? s.laserLevel * 200
          : eggCost(s);
  if (
    s.money < cost ||
    (action === 'fish' && s.fish.length >= 12) ||
    (action === 'food' && s.foodLevel >= 3) ||
    (action === 'laser' && s.laserLevel >= 3) ||
    (action === 'egg' && s.eggs >= 3)
  )
    return false;
  s.money -= cost;
  if (action === 'fish')
    s.fish.push({
      id: s.nextId++,
      x: 300,
      y: 220,
      direction: 1,
      hunger: 80,
      growth: 0,
      coin: 8,
    });
  if (action === 'food') s.foodLevel++;
  if (action === 'laser') s.laserLevel++;
  if (action === 'egg') {
    s.eggs++;
    s.score += 1000;
  }
  return true;
}
export function tapTank(s: AquariumState, x: number, y: number) {
  const coin = s.coins.find((c) => Math.hypot(c.x - x, c.y - y) < 32);
  if (coin) {
    s.money += coin.value;
    s.score += coin.value;
    s.coins = s.coins.filter((c) => c !== coin);
    return 'coin';
  }
  if (s.monster && Math.hypot(s.monster.x - x, s.monster.y - y) < 52) {
    s.monster.hp -= s.laserLevel;
    s.monster.x = Math.max(
      40,
      Math.min(560, s.monster.x + (s.monster.x < 300 ? -8 : 8)),
    );
    if (s.monster.hp <= 0) {
      s.coins.push({
        id: s.nextId++,
        x: s.monster.x,
        y: s.monster.y,
        value: 150,
      });
      s.monster = null;
    }
    return 'laser';
  }
  if (s.money >= 5 && s.food.length < 12 && y > 160 && y < 700) {
    s.money -= 5;
    s.food.push({
      id: s.nextId++,
      x: Math.max(30, Math.min(570, x)),
      y,
      value: s.foodLevel,
    });
    return 'food';
  }
  return null;
}
export function stepAquarium(s: AquariumState, dt: number) {
  dt = Math.max(0, Math.min(0.05, dt));
  if (!s.monster) {
    s.invasion -= dt;
    if (s.invasion <= 0) {
      s.monster = { x: 50, y: 300, hp: 12 + s.level * 4, bite: 3 };
      s.invasion = Math.max(22, 45 - s.level * 3);
    }
  }
  for (const f of s.food) f.y += 37 * dt;
  for (const c of s.coins) c.y += 30 * dt;
  for (const f of s.fish) {
    f.hunger -= dt * 1.5;
    f.coin -= dt;
    const target = s.food
      .filter((p) => p.y < 700)
      .sort(
        (a, b) =>
          Math.hypot(a.x - f.x, a.y - f.y) - Math.hypot(b.x - f.x, b.y - f.y),
      )[0];
    if (target && f.hunger < 85) {
      const dx = target.x - f.x,
        dy = target.y - f.y,
        d = Math.hypot(dx, dy);
      if (d < 16) {
        f.hunger = Math.min(100, f.hunger + 30 + target.value * 12);
        f.growth = Math.min(6, f.growth + target.value);
        target.y = 900;
      } else {
        f.x += (dx / d) * 65 * dt;
        f.y += (dy / d) * 65 * dt;
        f.direction = dx >= 0 ? 1 : -1;
      }
    } else {
      f.x += f.direction * (22 + f.growth * 2) * dt;
      f.y += Math.sin(f.x / 80 + f.id) * dt * 7;
    }
    if (f.x < 35) {
      f.x = 35;
      f.direction = 1;
    }
    if (f.x > 565) {
      f.x = 565;
      f.direction = -1;
    }
    f.y = Math.max(180, Math.min(665, f.y));
    if (f.coin <= 0) {
      s.coins.push({
        id: s.nextId++,
        x: f.x,
        y: f.y,
        value: f.growth >= 4 ? 75 : f.growth >= 2 ? 35 : 15,
      });
      f.coin = 8;
    }
  }
  if (s.monster) {
    const m = s.monster,
      f = s.fish.reduce<TankFish | undefined>(
        (best, f) =>
          !best ||
          Math.hypot(f.x - m.x, f.y - m.y) <
            Math.hypot(best.x - m.x, best.y - m.y)
            ? f
            : best,
        undefined,
      );
    if (f) {
      const dx = f.x - m.x,
        dy = f.y - m.y,
        d = Math.hypot(dx, dy);
      if (d > 1) {
        m.x += (dx / d) * 30 * dt;
        m.y += (dy / d) * 30 * dt;
      }
      m.bite -= dt;
      if (d < 45 && m.bite <= 0) {
        f.hunger = 0;
        m.bite = 3;
      }
    }
  }
  s.fish = s.fish.filter((f) => f.hunger > 0);
  s.food = s.food.filter((f) => f.y < 710);
  s.coins = s.coins.filter((c) => c.y < 715).slice(-60);
}
export function isAquariumState(v: unknown): v is AquariumState {
  if (!v || typeof v !== 'object') return false;
  const s = v as AquariumState;
  const n = (v: number, min: number, max: number) =>
    Number.isFinite(v) && v >= min && v <= max;
  const int = (v: number, min: number, max: number) =>
    Number.isInteger(v) && n(v, min, max);
  const drop = (d: Drop) =>
    d &&
    int(d.id, 1, s.nextId - 1) &&
    n(d.x, 0, 600) &&
    n(d.y, 160, 715) &&
    n(d.value, 1, 150);
  if (
    !(
      s.version === 1 &&
      int(s.level, 1, 1000) &&
      int(s.money, 0, 10000000) &&
      int(s.score, 0, 100000000) &&
      int(s.eggs, 0, 2) &&
      int(s.foodLevel, 1, 3) &&
      int(s.laserLevel, 1, 3) &&
      int(s.nextId, 3, 10000000) &&
      n(s.invasion, 0, 45) &&
      Array.isArray(s.fish) &&
      s.fish.length <= 12 &&
      Array.isArray(s.food) &&
      s.food.length <= 12 &&
      Array.isArray(s.coins) &&
      s.coins.length <= 60
    )
  )
    return false;
  if (
    !s.fish.every(
      (f) =>
        f &&
        int(f.id, 1, s.nextId - 1) &&
        n(f.x, 30, 570) &&
        n(f.y, 180, 665) &&
        [-1, 1].includes(f.direction) &&
        n(f.hunger, 0.001, 100) &&
        int(f.growth, 0, 6) &&
        n(f.coin, 0, 8),
    ) ||
    !s.food.every(drop) ||
    !s.coins.every(drop)
  )
    return false;
  const ids = [...s.fish, ...s.food, ...s.coins].map((x) => x.id);
  return (
    new Set(ids).size === ids.length &&
    (s.monster === null ||
      (!!s.monster &&
        n(s.monster.x, 0, 600) &&
        n(s.monster.y, 160, 700) &&
        int(s.monster.hp, 1, 12 + s.level * 4) &&
        n(s.monster.bite, -1000, 3)))
  );
}
