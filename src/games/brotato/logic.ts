export const WIDTH = 800;
export const HEIGHT = 720;
export const ARENA = { left: 30, right: 770, top: 124, bottom: 618 };
export type Stat =
  | 'maxHp'
  | 'regen'
  | 'armor'
  | 'damage'
  | 'melee'
  | 'ranged'
  | 'attackSpeed'
  | 'crit'
  | 'speed'
  | 'dodge'
  | 'harvest'
  | 'range';
export type Stats = Record<Stat, number>;
export type WeaponId =
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'knife'
  | 'spear'
  | 'wand';
export type Character = 'balanced' | 'ranger' | 'brawler';
export const CHARACTERS: Character[] = ['balanced', 'ranger', 'brawler'];
export interface WeaponDef {
  damage: number;
  cooldown: number;
  range: number;
  melee: boolean;
  pellets: number;
  price: number;
  family: 'gun' | 'blade' | 'elemental';
}
export const WEAPONS: Record<WeaponId, WeaponDef> = {
  pistol: {
    damage: 12,
    cooldown: 0.8,
    range: 280,
    melee: false,
    pellets: 1,
    price: 18,
    family: 'gun',
  },
  smg: {
    damage: 4,
    cooldown: 0.16,
    range: 230,
    melee: false,
    pellets: 1,
    price: 22,
    family: 'gun',
  },
  shotgun: {
    damage: 6,
    cooldown: 1.1,
    range: 210,
    melee: false,
    pellets: 4,
    price: 24,
    family: 'gun',
  },
  knife: {
    damage: 14,
    cooldown: 0.55,
    range: 78,
    melee: true,
    pellets: 1,
    price: 15,
    family: 'blade',
  },
  spear: {
    damage: 22,
    cooldown: 1,
    range: 132,
    melee: true,
    pellets: 1,
    price: 20,
    family: 'blade',
  },
  wand: {
    damage: 17,
    cooldown: 0.9,
    range: 260,
    melee: false,
    pellets: 1,
    price: 23,
    family: 'elemental',
  },
};
export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const ITEMS = {
  heart: { icon: 'heart', price: 20, stats: { maxHp: 6, speed: -2 } },
  coffee: { icon: 'coffee', price: 18, stats: { attackSpeed: 12, damage: -3 } },
  armor: { icon: 'armor', price: 22, stats: { armor: 2, speed: -3 } },
  boots: { icon: 'boots', price: 18, stats: { speed: 8, armor: -1 } },
  harvest: { icon: 'harvest', price: 20, stats: { harvest: 8, damage: -3 } },
  crit: { icon: 'crit', price: 20, stats: { crit: 8, maxHp: -2 } },
  scope: {
    icon: 'pistol',
    price: 22,
    stats: { ranged: 3, melee: -2, range: 20 },
  },
  whetstone: { icon: 'knife', price: 20, stats: { melee: 4, ranged: -2 } },
  regen: { icon: 'food', price: 18, stats: { regen: 2, range: -10 } },
  reflex: { icon: 'boots', price: 22, stats: { dodge: 6, damage: -3 } },
} satisfies Record<
  string,
  { icon: string; price: number; stats: Partial<Stats> }
>;
export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export interface Weapon {
  id: number;
  kind: WeaponId;
  tier: number;
  cooldown: number;
  angle: number;
  flash: number;
}
export interface Offer {
  kind: 'weapon' | 'item';
  key: WeaponId | ItemId;
  tier: number;
  price: number;
  locked: boolean;
}
export interface Upgrade {
  stat: Stat;
  value: number;
  tier: number;
}
export interface Enemy {
  id: number;
  kind: 'chaser' | 'charger' | 'tank' | 'ranged' | 'boss' | 'tree';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  damage: number;
  timer: number;
  warning: number;
  angle: number;
}
export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  damage: number;
  hostile: boolean;
  pierce: number;
  hits: number[];
  icon: WeaponId;
}
export interface Drop {
  id: number;
  x: number;
  y: number;
  kind: 'material' | 'food' | 'crate';
  value: number;
}
export interface Run {
  version: 1;
  phase: 'ready' | 'wave' | 'upgrade' | 'loot' | 'shop' | 'dead' | 'won';
  character: Character;
  wave: number;
  remaining: number;
  hp: number;
  x: number;
  y: number;
  invincible: number;
  stats: Stats;
  cash: number;
  bag: number;
  xp: number;
  level: number;
  pending: number;
  kills: number;
  score: number;
  weapons: Weapon[];
  items: ItemId[];
  offers: (Offer | null)[];
  upgrades: Upgrade[];
  loot: ItemId[];
  enemies: Enemy[];
  bullets: Bullet[];
  drops: Drop[];
  spawn: number;
  treeTimer: number;
  rerolls: number;
  serial: number;
  seed: number;
}
export type Effect = {
  kind: 'shoot' | 'hit' | 'collect' | 'upgrade' | 'kill' | 'hurt' | 'clear';
  x: number;
  y: number;
  value?: number;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function random(s: Run) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return s.seed / 4294967296;
}
function pick<T>(s: Run, list: readonly T[]): T {
  return list[Math.floor(random(s) * list.length)];
}
export function waveDuration(wave: number) {
  return wave === 20 ? 90 : Math.min(60, 15 + wave * 5);
}
export function newRun(
  character: Character = 'balanced',
  weapon: WeaponId = 'pistol',
  seed = Math.floor(Math.random() * 4294967296),
): Run {
  const stats: Stats = {
    maxHp: 30,
    regen: 0,
    armor: 0,
    damage: 0,
    melee: 0,
    ranged: 0,
    attackSpeed: 0,
    crit: 5,
    speed: 0,
    dodge: 0,
    harvest: 0,
    range: 0,
  };
  if (character === 'balanced')
    Object.assign(stats, { maxHp: 35, damage: 5, harvest: 5 });
  if (character === 'ranger')
    Object.assign(stats, {
      maxHp: 25,
      ranged: 4,
      range: 40,
      attackSpeed: 10,
      melee: -3,
    });
  if (character === 'brawler')
    Object.assign(stats, { maxHp: 40, melee: 5, armor: 2, ranged: -3 });
  return {
    version: 1,
    phase: 'ready',
    character,
    wave: 1,
    remaining: 20,
    hp: stats.maxHp,
    x: 400,
    y: 370,
    invincible: 0,
    stats,
    cash: 0,
    bag: 0,
    xp: 0,
    level: 1,
    pending: 0,
    kills: 0,
    score: 0,
    weapons: [
      { id: 1, kind: weapon, tier: 1, cooldown: 0, angle: 0, flash: 0 },
    ],
    items: [],
    offers: [],
    upgrades: [],
    loot: [],
    enemies: [],
    bullets: [],
    drops: [],
    spawn: 0.5,
    treeTimer: 4,
    rerolls: 0,
    serial: 2,
    seed: seed >>> 0,
  };
}
export function experienceNeeded(level: number) {
  return 8 + level * 5;
}
function experience(s: Run, amount: number) {
  s.xp += amount;
  while (s.xp >= experienceNeeded(s.level)) {
    s.xp -= experienceNeeded(s.level);
    s.level++;
    s.pending++;
    s.stats.maxHp++;
    s.hp = Math.min(s.stats.maxHp, s.hp + 1);
  }
}
export function changeStats(s: Run, stats: Partial<Stats>, multiplier = 1) {
  for (const key of Object.keys(stats) as Stat[])
    s.stats[key] += (stats[key] ?? 0) * multiplier;
  s.stats.maxHp = Math.max(1, s.stats.maxHp);
  s.hp = Math.min(s.hp, s.stats.maxHp);
}
export function effectiveStats(s: Run): Stats {
  const stats = { ...s.stats };
  stats.ranged += Math.floor(
    s.weapons.filter((w) => WEAPONS[w.kind].family === 'gun').length / 2,
  );
  stats.melee +=
    Math.floor(
      s.weapons.filter((w) => WEAPONS[w.kind].family === 'blade').length / 2,
    ) * 2;
  return stats;
}
export function startWave(s: Run) {
  if (s.phase !== 'ready' && s.phase !== 'shop') return false;
  if (s.phase === 'shop') s.wave++;
  s.phase = 'wave';
  s.remaining = waveDuration(s.wave);
  s.x = 400;
  s.y = 370;
  s.hp = s.stats.maxHp;
  s.invincible = 1;
  s.spawn = 0.6;
  s.treeTimer = 3;
  s.enemies = [];
  s.drops = [];
  s.bullets = [];
  s.rerolls = 0;
  for (const w of s.weapons) {
    w.cooldown = 0;
    w.flash = 0;
  }
  if (s.wave === 20) spawnEnemy(s, 'boss');
  return true;
}
export function rerollCost(s: Run) {
  return 2 + s.wave + s.rerolls * 2;
}
function rarity(s: Run) {
  const r = random(s);
  return s.wave >= 8 && r < 0.06
    ? 4
    : s.wave >= 4 && r < 0.18
      ? 3
      : s.wave >= 2 && r < 0.4
        ? 2
        : 1;
}
function offer(s: Run, weapon: boolean): Offer {
  const tier = rarity(s);
  const kind = weapon ? 'weapon' : 'item';
  const key = weapon
    ? random(s) < 0.3 && s.weapons.length
      ? pick(s, s.weapons).kind
      : pick(s, WEAPON_IDS)
    : pick(s, ITEM_IDS);
  const base =
    kind === 'weapon'
      ? WEAPONS[key as WeaponId].price
      : ITEMS[key as ItemId].price;
  return {
    kind,
    key,
    tier,
    price: Math.round(base * (1 + s.wave * 0.08) * (1 + (tier - 1) * 0.8)),
    locked: false,
  };
}
function stock(s: Run) {
  const next = s.offers.map((o) => (o?.locked ? o : null));
  let required = Math.max(
    0,
    (s.wave <= 2 ? 2 : s.wave <= 5 ? 1 : 0) -
      next.filter((o) => o?.kind === 'weapon').length,
  );
  for (let i = 0; i < 4; i++) {
    if (next[i]) continue;
    const weapon = required > 0 || (s.wave > 2 && random(s) < 0.35);
    if (weapon && required > 0) required--;
    let card = offer(s, weapon);
    const duplicate = (o: Offer) =>
      next.some(
        (v) =>
          v?.kind === o.kind &&
          v.key === o.key &&
          (o.kind === 'item' || v.tier === o.tier),
      );
    for (let tries = 0; duplicate(card) && tries < 30; tries++)
      card = offer(s, weapon);
    if (duplicate(card)) {
      const pool = weapon ? WEAPON_IDS : ITEM_IDS;
      const key = pool.find((k) => !duplicate({ ...card, key: k }));
      if (key)
        card = {
          ...card,
          key,
          price: Math.round(
            (weapon
              ? WEAPONS[key as WeaponId].price
              : ITEMS[key as ItemId].price) *
              (1 + s.wave * 0.08) *
              (1 + (card.tier - 1) * 0.8),
          ),
        };
    }
    next[i] = card;
  }
  s.offers = next;
}
export function rerollShop(s: Run) {
  const cost = rerollCost(s);
  if (s.phase !== 'shop' || s.cash < cost) return false;
  s.cash -= cost;
  s.rerolls++;
  stock(s);
  return true;
}
export function lockOffer(s: Run, index: number) {
  const o = s.offers[index];
  if (s.phase !== 'shop' || !o) return false;
  o.locked = !o.locked;
  return true;
}
export function canBuy(s: Run, o: Offer) {
  return (
    s.cash >= o.price &&
    (o.kind === 'item' ||
      s.weapons.length < 6 ||
      s.weapons.some(
        (w) => w.kind === o.key && w.tier === o.tier && w.tier < 4,
      ))
  );
}
export function buyOffer(s: Run, index: number) {
  const o = s.offers[index];
  if (s.phase !== 'shop' || !o || !canBuy(s, o)) return false;
  s.cash -= o.price;
  if (o.kind === 'item') {
    const id = o.key as ItemId;
    s.items.push(id);
    changeStats(s, ITEMS[id].stats, o.tier);
  } else {
    const same = s.weapons.find(
      (w) => w.kind === o.key && w.tier === o.tier && w.tier < 4,
    );
    if (same && s.weapons.length === 6) same.tier++;
    else
      s.weapons.push({
        id: s.serial++,
        kind: o.key as WeaponId,
        tier: o.tier,
        cooldown: 0,
        angle: 0,
        flash: 0,
      });
  }
  s.offers[index] = null;
  if (s.offers.every((o) => o === null)) stock(s);
  return true;
}
export function recycleValue(w: Weapon, wave: number) {
  return Math.max(
    1,
    Math.floor(
      WEAPONS[w.kind].price *
        (1 + wave * 0.08) *
        (1 + (w.tier - 1) * 0.8) *
        0.3,
    ),
  );
}
export function recycleWeapon(s: Run, index: number) {
  if (s.phase !== 'shop' || s.weapons.length <= 1 || !s.weapons[index])
    return false;
  s.cash += recycleValue(s.weapons[index], s.wave);
  s.weapons.splice(index, 1);
  return true;
}
export function combineWeapons(s: Run, index: number) {
  const w = s.weapons[index];
  if (s.phase !== 'shop' || !w || w.tier === 4) return false;
  const other = s.weapons.findIndex(
    (v, i) => i !== index && v.kind === w.kind && v.tier === w.tier,
  );
  if (other < 0) return false;
  w.tier++;
  s.weapons.splice(other, 1);
  return true;
}
const UPGRADE_VALUES: Record<Stat, number> = {
  maxHp: 3,
  regen: 1,
  armor: 1,
  damage: 5,
  melee: 2,
  ranged: 1,
  attackSpeed: 5,
  crit: 3,
  speed: 3,
  dodge: 3,
  harvest: 5,
  range: 10,
};
function rollUpgrades(s: Run) {
  const pool = Object.keys(UPGRADE_VALUES) as Stat[];
  s.upgrades = [];
  for (let i = 0; i < 4; i++) {
    const stat = pool.splice(Math.floor(random(s) * pool.length), 1)[0];
    const tier = rarity(s);
    s.upgrades.push({ stat, value: UPGRADE_VALUES[stat] * tier, tier });
  }
}
function between(s: Run) {
  if (s.pending > 0) {
    s.phase = 'upgrade';
    rollUpgrades(s);
  } else if (s.loot.length) s.phase = 'loot';
  else {
    s.phase = 'shop';
    stock(s);
  }
}
export function chooseUpgrade(s: Run, index: number) {
  const u = s.upgrades[index];
  if (s.phase !== 'upgrade' || !u) return false;
  changeStats(s, { [u.stat]: u.value });
  s.pending--;
  between(s);
  return true;
}
export function takeLoot(s: Run, recycle = false) {
  if (s.phase !== 'loot' || !s.loot.length) return false;
  const item = s.loot.shift();
  if (!item) return false;
  if (recycle) s.cash += Math.floor(ITEMS[item].price * 0.5);
  else {
    s.items.push(item);
    changeStats(s, ITEMS[item].stats);
  }
  between(s);
  return true;
}
export function completeWave(s: Run) {
  if (s.phase !== 'wave') return;
  for (const d of s.drops) {
    if (d.kind === 'material') s.bag += d.value;
    if (d.kind === 'crate') s.loot.push(pick(s, ITEM_IDS));
    if (d.kind === 'food') s.hp = Math.min(s.stats.maxHp, s.hp + 3);
  }
  const harvest = Math.max(0, s.stats.harvest);
  s.cash += harvest;
  experience(s, harvest);
  if (harvest > 0) s.stats.harvest += Math.ceil(harvest * 0.05);
  s.drops = [];
  s.enemies = [];
  s.bullets = [];
  s.score += s.wave * 100;
  if (s.wave === 20) s.phase = 'won';
  else between(s);
}
export function spawnEnemy(s: Run, kind: Enemy['kind']) {
  const edge = Math.floor(random(s) * 4);
  const x =
    edge < 2
      ? edge === 0
        ? ARENA.left
        : ARENA.right
      : ARENA.left + random(s) * (ARENA.right - ARENA.left);
  const y =
    edge >= 2
      ? edge === 2
        ? ARENA.top
        : ARENA.bottom
      : ARENA.top + random(s) * (ARENA.bottom - ARENA.top);
  const hp =
    (kind === 'boss'
      ? 1800
      : kind === 'tank'
        ? 32
        : kind === 'tree'
          ? 12
          : kind === 'charger'
            ? 9
            : 7) *
    (1 + s.wave * 0.22);
  s.enemies.push({
    id: s.serial++,
    kind,
    x,
    y,
    hp,
    maxHp: hp,
    radius: kind === 'boss' ? 38 : kind === 'tank' ? 20 : 14,
    speed:
      kind === 'tree'
        ? 0
        : kind === 'tank'
          ? 30
          : kind === 'boss'
            ? 46
            : kind === 'charger'
              ? 74
              : 43 + s.wave * 1.2,
    damage: kind === 'boss' ? 14 : 2 + s.wave * 0.55,
    timer: 1.5,
    warning: 0.75,
    angle: 0,
  });
  if (kind === 'tree') {
    const e = s.enemies[s.enemies.length - 1];
    e.x = 85 + random(s) * 630;
    e.y = 170 + random(s) * 390;
  }
}
function drop(s: Run, e: Enemy, kind: Drop['kind'], value = 1) {
  if (s.drops.length >= 350 && kind === 'material') {
    const d = s.drops.find((d) => d.kind === 'material');
    if (d) {
      d.value += value;
      return;
    }
  }
  s.drops.push({ id: s.serial++, x: e.x, y: e.y, kind, value });
}
function kill(s: Run, e: Enemy, effects: Effect[]) {
  if (!s.enemies.some((v) => v.id === e.id)) return;
  s.enemies = s.enemies.filter((v) => v.id !== e.id);
  s.kills++;
  s.score += e.kind === 'boss' ? 500 : 10;
  drop(s, e, 'material', e.kind === 'boss' ? 30 : e.kind === 'tank' ? 3 : 1);
  if (e.kind === 'tree' || random(s) < 0.025) drop(s, e, 'food');
  if (e.kind === 'tree' ? random(s) < 0.22 : random(s) < 0.008)
    drop(s, e, 'crate');
  effects.push({ kind: 'kill', x: e.x, y: e.y });
}
function damageEnemy(s: Run, e: Enemy, damage: number, effects: Effect[]) {
  e.hp -= damage;
  effects.push({ kind: 'hit', x: e.x, y: e.y, value: damage });
  if (e.hp <= 0) kill(s, e, effects);
}
function hurt(s: Run, damage: number, effects: Effect[]) {
  if (s.invincible > 0 || random(s) * 100 < clamp(s.stats.dodge, 0, 60)) return;
  const actual = Math.max(
    1,
    Math.round(
      s.stats.armor >= 0
        ? damage / (1 + s.stats.armor * 0.06)
        : damage * (1 - s.stats.armor * 0.06),
    ),
  );
  s.hp -= actual;
  s.invincible = 0.65;
  effects.push({ kind: 'hurt', x: s.x, y: s.y, value: actual });
  if (s.hp <= 0) {
    s.hp = 0;
    s.phase = 'dead';
  }
}
function fireEnemy(s: Run, e: Enemy, angle: number, spread: boolean) {
  for (let i = 0; i < (spread ? 8 : 1); i++) {
    const a = spread ? angle + (i * Math.PI) / 4 : angle;
    s.bullets.push({
      id: s.serial++,
      x: e.x,
      y: e.y,
      vx: Math.cos(a) * 125,
      vy: Math.sin(a) * 125,
      life: 5,
      damage: e.damage,
      hostile: true,
      pierce: 0,
      hits: [],
      icon: 'wand',
    });
  }
}
export function stepRun(s: Run, dt: number, moveX = 0, moveY = 0): Effect[] {
  const effects: Effect[] = [];
  if (s.phase !== 'wave') return effects;
  dt = clamp(dt, 0, 0.05);
  s.remaining = Math.max(0, s.remaining - dt);
  s.invincible = Math.max(0, s.invincible - dt);
  const stats = effectiveStats(s);
  const len = Math.hypot(moveX, moveY);
  if (len) {
    const speed = 150 * Math.max(0.25, 1 + stats.speed / 100);
    s.x = clamp(
      s.x + (moveX / len) * speed * dt,
      ARENA.left + 15,
      ARENA.right - 15,
    );
    s.y = clamp(
      s.y + (moveY / len) * speed * dt,
      ARENA.top + 15,
      ARENA.bottom - 15,
    );
  }
  s.hp = Math.min(stats.maxHp, s.hp + Math.max(0, stats.regen) * 0.2 * dt);
  s.spawn = Math.max(0, s.spawn - dt);
  s.treeTimer -= dt;
  if (s.spawn <= 0 && s.enemies.length < 180) {
    s.spawn = Math.max(0.18, 0.9 - s.wave * 0.032);
    for (let i = 0; i < 1 + Math.floor(s.wave / 5); i++)
      spawnEnemy(
        s,
        s.wave >= 7 && random(s) < 0.13
          ? 'ranged'
          : s.wave >= 4 && random(s) < 0.18
            ? 'tank'
            : s.wave >= 2 && random(s) < 0.23
              ? 'charger'
              : 'chaser',
      );
  }
  if (s.treeTimer <= 0) {
    s.treeTimer = 12;
    spawnEnemy(s, 'tree');
  }
  for (const e of [...s.enemies]) {
    e.warning = Math.max(0, e.warning - dt);
    if (e.warning > 0) continue;
    const dx = s.x - e.x,
      dy = s.y - e.y,
      dist = Math.hypot(dx, dy) || 1;
    const angle = Math.atan2(dy, dx);
    e.timer -= dt;
    if (e.kind === 'charger') {
      if (e.timer < 0) {
        e.timer = 2.5;
        e.angle = angle;
      }
      const charge = e.timer > 2;
      const a = charge ? e.angle : angle;
      e.x += Math.cos(a) * e.speed * (charge ? 2.7 : 0.7) * dt;
      e.y += Math.sin(a) * e.speed * (charge ? 2.7 : 0.7) * dt;
    } else if (e.kind !== 'tree') {
      const direction =
        e.kind === 'ranged' ? (dist > 240 ? 1 : dist < 160 ? -1 : 0) : 1;
      e.x += (dx / dist) * e.speed * direction * dt;
      e.y += (dy / dist) * e.speed * direction * dt;
    }
    e.x = clamp(e.x, ARENA.left, ARENA.right);
    e.y = clamp(e.y, ARENA.top, ARENA.bottom);
    if ((e.kind === 'ranged' || e.kind === 'boss') && e.timer <= 0) {
      e.timer = e.kind === 'boss' ? 2 : 3;
      fireEnemy(s, e, angle, e.kind === 'boss');
    }
    if (e.kind !== 'tree' && Math.hypot(s.x - e.x, s.y - e.y) < e.radius + 13)
      hurt(s, e.damage, effects);
  }
  for (const w of s.weapons) {
    w.cooldown -= dt;
    w.flash = Math.max(0, w.flash - dt);
    const def = WEAPONS[w.kind],
      reach = Math.max(50, def.range + stats.range * (def.melee ? 0.25 : 1));
    let target: Enemy | undefined;
    let distance = reach;
    for (const e of s.enemies) {
      if (e.warning > 0) continue;
      const d = Math.hypot(e.x - s.x, e.y - s.y) - e.radius;
      if (d < distance) {
        distance = d;
        target = e;
      }
    }
    if (!target) continue;
    w.angle = Math.atan2(target.y - s.y, target.x - s.x);
    if (w.cooldown > 0) continue;
    w.cooldown = def.cooldown / Math.max(0.2, 1 + stats.attackSpeed / 100);
    w.flash = 0.13;
    let damage = Math.max(
      1,
      (def.damage * (1 + (w.tier - 1) * 0.65) +
        (def.melee ? stats.melee : stats.ranged)) *
        Math.max(0.1, 1 + stats.damage / 100),
    );
    if (
      random(s) * 100 <
      clamp(stats.crit + (w.kind === 'knife' ? 15 : 0), 0, 100)
    )
      damage *= 2;
    damage = Math.round(damage);
    effects.push({ kind: 'shoot', x: s.x, y: s.y });
    if (def.melee) {
      for (const e of [...s.enemies]) {
        const angle = Math.atan2(e.y - s.y, e.x - s.x);
        const diff = Math.atan2(
          Math.sin(angle - w.angle),
          Math.cos(angle - w.angle),
        );
        if (
          e.warning <= 0 &&
          Math.hypot(e.x - s.x, e.y - s.y) < reach + e.radius &&
          Math.abs(diff) < 0.8
        )
          damageEnemy(s, e, damage, effects);
      }
    } else {
      for (let i = 0; i < def.pellets; i++) {
        const a = w.angle + (i - (def.pellets - 1) / 2) * 0.16;
        s.bullets.push({
          id: s.serial++,
          x: s.x + Math.cos(a) * 25,
          y: s.y + Math.sin(a) * 25,
          vx: Math.cos(a) * 480,
          vy: Math.sin(a) * 480,
          life: reach / 480,
          damage,
          hostile: false,
          pierce: w.kind === 'wand' ? 2 : 0,
          hits: [],
          icon: w.kind,
        });
      }
    }
  }
  for (const b of s.bullets) {
    b.life -= dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.life <= 0) continue;
    if (b.hostile) {
      if (Math.hypot(b.x - s.x, b.y - s.y) < 18) {
        hurt(s, b.damage, effects);
        b.life = 0;
      }
    } else
      for (const e of [...s.enemies]) {
        if (
          e.warning > 0 ||
          b.hits.includes(e.id) ||
          Math.hypot(b.x - e.x, b.y - e.y) > e.radius + 6
        )
          continue;
        damageEnemy(s, e, b.damage, effects);
        b.hits.push(e.id);
        if (b.pierce-- <= 0) {
          b.life = 0;
          break;
        }
      }
  }
  s.bullets = s.bullets
    .filter(
      (b) => b.life > 0 && b.x > 0 && b.x < WIDTH && b.y > 105 && b.y < 640,
    )
    .slice(-250);
  for (const d of [...s.drops]) {
    const dx = s.x - d.x,
      dy = s.y - d.y,
      dist = Math.hypot(dx, dy);
    if (dist < 80 && dist > 16) {
      d.x += (dx / dist) * 340 * dt;
      d.y += (dy / dist) * 340 * dt;
    }
    if (Math.hypot(s.x - d.x, s.y - d.y) > 23) continue;
    if (d.kind === 'food' && s.hp >= stats.maxHp) continue;
    s.drops = s.drops.filter((v) => v.id !== d.id);
    if (d.kind === 'material') {
      const extra = Math.min(s.bag, d.value);
      s.bag -= extra;
      s.cash += d.value + extra;
      experience(s, d.value + extra);
    }
    if (d.kind === 'food') s.hp = Math.min(stats.maxHp, s.hp + 3);
    if (d.kind === 'crate') s.loot.push(pick(s, ITEM_IDS));
    effects.push({ kind: 'collect', x: d.x, y: d.y });
  }
  if (s.hp <= 0) return effects;
  if (
    s.remaining === 0 ||
    (s.wave === 20 && !s.enemies.some((e) => e.kind === 'boss'))
  ) {
    completeWave(s);
    effects.push({ kind: 'clear', x: s.x, y: s.y });
  }
  return effects;
}

// Snapshots are local input: reject malformed or older data before handing it to the scene.
export function isRun(value: unknown): value is Run {
  if (!value || typeof value !== 'object') return false;
  const s = value as Run;
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const integer = (v: unknown, min: number, max: number) =>
    finite(v) &&
    Number.isInteger(v) &&
    (v as number) >= min &&
    (v as number) <= max;
  const point = (v: { x: number; y: number }) =>
    v && finite(v.x) && finite(v.y);
  if (
    s.version !== 1 ||
    !['ready', 'wave', 'upgrade', 'loot', 'shop', 'dead', 'won'].includes(
      s.phase,
    ) ||
    !CHARACTERS.includes(s.character) ||
    !integer(s.wave, 1, 20) ||
    !integer(s.level, 1, 10000) ||
    !integer(s.seed, 0, 4294967295) ||
    !integer(s.serial, 2, Number.MAX_SAFE_INTEGER) ||
    !point(s)
  )
    return false;
  for (const k of [
    'remaining',
    'hp',
    'invincible',
    'cash',
    'bag',
    'xp',
    'pending',
    'kills',
    'score',
    'spawn',
    'treeTimer',
    'rerolls',
  ] as const)
    if (!finite(s[k]) || s[k] < 0) return false;
  if (
    !s.stats ||
    !Object.keys(UPGRADE_VALUES).every((k) => finite(s.stats[k as Stat])) ||
    s.stats.maxHp < 1 ||
    s.hp > s.stats.maxHp ||
    s.remaining > waveDuration(s.wave)
  )
    return false;
  const list = <T>(v: T[], max: number, valid: (v: T) => boolean) =>
    Array.isArray(v) && v.length <= max && v.every(valid);
  const tier = (n: number) => integer(n, 1, 4);
  if (
    !list(
      s.weapons,
      6,
      (w) =>
        w &&
        integer(w.id, 1, s.serial) &&
        WEAPON_IDS.includes(w.kind) &&
        tier(w.tier) &&
        finite(w.cooldown) &&
        finite(w.angle) &&
        finite(w.flash),
    ) ||
    !s.weapons.length
  )
    return false;
  if (
    !list(s.items, 10000, (v) => ITEM_IDS.includes(v)) ||
    !list(s.loot, 1000, (v) => ITEM_IDS.includes(v))
  )
    return false;
  if (
    !list(
      s.offers,
      4,
      (o) =>
        o === null ||
        (o &&
          (o.kind === 'weapon'
            ? WEAPON_IDS.includes(o.key as WeaponId)
            : o.kind === 'item' && ITEM_IDS.includes(o.key as ItemId)) &&
          tier(o.tier) &&
          integer(o.price, 1, 1000000) &&
          typeof o.locked === 'boolean'),
    )
  )
    return false;
  if (
    !list(
      s.upgrades,
      4,
      (u) => u && u.stat in UPGRADE_VALUES && finite(u.value) && tier(u.tier),
    )
  )
    return false;
  if (
    !list(
      s.enemies,
      190,
      (e) =>
        point(e) &&
        integer(e.id, 1, s.serial) &&
        ['chaser', 'charger', 'tank', 'ranged', 'boss', 'tree'].includes(
          e.kind,
        ) &&
        [
          'hp',
          'maxHp',
          'radius',
          'speed',
          'damage',
          'timer',
          'warning',
          'angle',
        ].every((k) => finite(e[k as keyof Enemy])),
    )
  )
    return false;
  if (
    !list(
      s.drops,
      500,
      (d) =>
        point(d) &&
        integer(d.id, 1, s.serial) &&
        ['material', 'food', 'crate'].includes(d.kind) &&
        integer(d.value, 1, 1000000),
    )
  )
    return false;
  if (
    !list(
      s.bullets,
      250,
      (b) =>
        point(b) &&
        integer(b.id, 1, s.serial) &&
        ['vx', 'vy', 'life', 'damage', 'pierce'].every((k) =>
          finite(b[k as keyof Bullet]),
        ) &&
        typeof b.hostile === 'boolean' &&
        WEAPON_IDS.includes(b.icon) &&
        list(b.hits, 190, (id) => integer(id, 1, s.serial)),
    )
  )
    return false;
  return (
    (s.phase !== 'upgrade' || (s.pending > 0 && s.upgrades.length === 4)) &&
    (s.phase !== 'loot' || s.loot.length > 0)
  );
}
