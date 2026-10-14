import { type Element, HEIGHT, LEVELS, type Rect, WIDTH } from './levels';

export interface Hero {
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  facing: number;
}
export interface TempleState {
  version: 1;
  level: number;
  phase: 'ready' | 'playing' | 'failed' | 'clear' | 'won';
  reason: 'fire' | 'water' | 'poison' | 'time' | 'fall' | null;
  heroes: [Hero, Hero];
  crates: (Rect & { vy: number })[];
  gems: boolean[];
  latched: boolean[];
  remaining: number;
  score: number;
  baseScore: number;
  selected: 0 | 1;
}
export interface HeroInput {
  move: number;
  jump: boolean;
  interact: boolean;
}
export type TempleEvent = 'jump' | 'gem' | 'lever' | 'failed' | 'clear' | 'won';
export const KIND: Element[] = ['fire', 'water'];
export const heroRect = (hero: Hero): Rect => ({
  x: hero.x - 12,
  y: hero.y - 36,
  w: 24,
  h: 36,
});
export const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function newTemple(level = 0, baseScore = 0): TempleState {
  const map = LEVELS[level];
  return {
    version: 1,
    level,
    phase: 'ready',
    reason: null,
    heroes: [70, 118].map((x) => ({
      x,
      y: 560,
      vy: 0,
      grounded: true,
      facing: 1,
    })) as [Hero, Hero],
    crates: map.crates.map((c) => ({ ...c, vy: 0 })),
    gems: map.gems.map(() => false),
    latched: map.gates.map(() => false),
    remaining: map.time,
    score: baseScore,
    baseScore,
    selected: 0,
  };
}
export function continueTemple(s: TempleState): TempleState {
  if (s.phase === 'clear') return newTemple(s.level + 1, s.score);
  if (s.phase === 'failed') return newTemple(s.level, s.baseScore);
  return s;
}
export function plateActive(s: TempleState, index: number) {
  const plate = LEVELS[s.level].plates[index];
  return [...s.heroes.map(heroRect), ...s.crates].some(
    (body) =>
      body.x + body.w > plate.x &&
      body.x < plate.x + plate.w &&
      Math.abs(body.y + body.h - (plate.y + plate.h)) < 7,
  );
}
export function gateOpen(s: TempleState, index: number) {
  return s.latched[index] || plateActive(s, LEVELS[s.level].gates[index].plate);
}
function solids(s: TempleState): Rect[] {
  return [
    ...LEVELS[s.level].platforms,
    ...LEVELS[s.level].gates.filter((_, i) => !gateOpen(s, i)),
  ];
}
function moveCrate(s: TempleState, index: number, dx: number) {
  const crate = s.crates[index];
  const next = { ...crate, x: crate.x + dx };
  if (
    next.x < 24 ||
    next.x + next.w > WIDTH - 24 ||
    [...solids(s), ...s.crates.filter((_, i) => i !== index)].some((r) =>
      overlaps(next, r),
    )
  )
    return false;
  crate.x = next.x;
  return true;
}
export function stepTemple(
  s: TempleState,
  seconds: number,
  input: [HeroInput, HeroInput],
): TempleEvent[] {
  const events: TempleEvent[] = [];
  if (s.phase !== 'playing') return events;
  const map = LEVELS[s.level];
  for (let i = 0; i < 2; i++) {
    const hero = s.heroes[i];
    if (input[i].jump && hero.grounded) {
      hero.vy = -430;
      hero.grounded = false;
      events.push('jump');
    }
    if (input[i].interact)
      map.gates.forEach((gate, index) => {
        if (
          !s.latched[index] &&
          Math.abs(hero.x - gate.lever.x) < 44 &&
          Math.abs(hero.y - (gate.lever.y + 20)) < 55
        ) {
          s.latched[index] = true;
          events.push('lever');
        }
      });
  }
  let elapsed = Math.max(0, Math.min(seconds, 0.1));
  while (elapsed > 0 && s.phase === 'playing') {
    const dt = Math.min(elapsed, 1 / 120, s.remaining);
    elapsed -= dt;
    s.remaining = Math.max(0, s.remaining - dt);
    for (const crate of s.crates) {
      const oldBottom = crate.y + crate.h;
      crate.vy += 1100 * dt;
      crate.y += crate.vy * dt;
      for (const platform of solids(s)) {
        if (
          overlaps(crate, platform) &&
          oldBottom <= platform.y + 1 &&
          crate.vy >= 0
        ) {
          crate.y = platform.y - crate.h;
          crate.vy = 0;
        }
      }
    }
    for (let i = 0; i < 2; i++) {
      const hero = s.heroes[i];
      const dx = Math.max(-1, Math.min(1, input[i].move)) * 185 * dt;
      if (dx) hero.facing = Math.sign(dx);
      hero.x = Math.max(36, Math.min(WIDTH - 36, hero.x + dx));
      s.crates.forEach((crate, index) => {
        if (overlaps(heroRect(hero), crate) && dx && moveCrate(s, index, dx))
          return;
        if (overlaps(heroRect(hero), crate))
          hero.x = dx > 0 ? crate.x - 12 : crate.x + crate.w + 12;
      });
      for (const solid of solids(s)) {
        if (overlaps(heroRect(hero), solid))
          hero.x = dx > 0 ? solid.x - 12 : solid.x + solid.w + 12;
      }
      const oldY = hero.y;
      hero.vy += 1100 * dt;
      hero.y += hero.vy * dt;
      hero.grounded = false;
      for (const solid of [...solids(s), ...s.crates]) {
        if (!overlaps(heroRect(hero), solid)) continue;
        if (hero.vy >= 0 && oldY <= solid.y + 1) {
          hero.y = solid.y;
          hero.vy = 0;
          hero.grounded = true;
        } else if (hero.vy < 0 && oldY - 36 >= solid.y + solid.h - 1) {
          hero.y = solid.y + solid.h + 36;
          hero.vy = 0;
        }
      }
      const feet = { x: hero.x - 9, y: hero.y - 3, w: 18, h: 3 };
      for (const pool of map.pools)
        if (
          overlaps(feet, { ...pool, y: pool.y + pool.h - 4, h: 4 }) &&
          pool.kind !== KIND[i]
        ) {
          s.reason = pool.kind;
          s.phase = 'failed';
        }
      if (hero.y > HEIGHT + 40) {
        s.reason = 'fall';
        s.phase = 'failed';
      }
      if (s.phase !== 'playing') break;
      map.gems.forEach((gem, index) => {
        if (
          !s.gems[index] &&
          gem.kind === KIND[i] &&
          overlaps(heroRect(hero), {
            x: gem.x - 10,
            y: gem.y - 12,
            w: 20,
            h: 24,
          })
        ) {
          s.gems[index] = true;
          s.score += 100;
          events.push('gem');
        }
      });
    }
    if (
      s.phase === 'playing' &&
      s.gems.every(Boolean) &&
      s.heroes.every(
        (hero, i) =>
          Math.abs(hero.x - map.exits[i].x) < 22 &&
          Math.abs(hero.y - map.exits[i].y) < 4,
      )
    ) {
      s.score += 500 + Math.ceil(s.remaining) * 5;
      s.phase = s.level === LEVELS.length - 1 ? 'won' : 'clear';
      events.push(s.phase);
    } else if (s.phase === 'playing' && s.remaining === 0) {
      s.reason = 'time';
      s.phase = 'failed';
    }
    if (s.phase === 'failed') events.push('failed');
  }
  return events;
}
export function isTempleState(value: unknown): value is TempleState {
  if (!value || typeof value !== 'object') return false;
  const s = value as TempleState;
  const num = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const int = (v: unknown, min: number, max: number) =>
    num(v, min, max) && Number.isInteger(v);
  if (s.version !== 1 || !int(s.level, 0, LEVELS.length - 1)) return false;
  const map = LEVELS[s.level];
  return (
    ['ready', 'playing', 'failed', 'clear'].includes(s.phase) &&
    (s.reason === null ||
      ['fire', 'water', 'poison', 'time', 'fall'].includes(s.reason)) &&
    (s.selected === 0 || s.selected === 1) &&
    num(s.remaining, 0, map.time) &&
    (s.phase !== 'playing' || s.remaining > 0) &&
    int(s.baseScore, 0, 1e7) &&
    int(s.score, s.baseScore, 1e7) &&
    Array.isArray(s.heroes) &&
    s.heroes.length === 2 &&
    s.heroes.every(
      (h) =>
        h &&
        num(h.x, 24, WIDTH - 24) &&
        num(h.y, 0, HEIGHT + 100) &&
        num(h.vy, -500, 1500) &&
        typeof h.grounded === 'boolean' &&
        (h.facing === -1 || h.facing === 1),
    ) &&
    Array.isArray(s.crates) &&
    s.crates.length === map.crates.length &&
    s.crates.every(
      (c, i) =>
        c &&
        c.w === map.crates[i].w &&
        c.h === map.crates[i].h &&
        num(c.x, 24, WIDTH - 24 - c.w) &&
        num(c.y, 0, HEIGHT + 100) &&
        num(c.vy, 0, 1500),
    ) &&
    Array.isArray(s.gems) &&
    s.gems.length === map.gems.length &&
    s.gems.every((g) => typeof g === 'boolean') &&
    Array.isArray(s.latched) &&
    s.latched.length === map.gates.length &&
    s.latched.every((g) => typeof g === 'boolean') &&
    (s.phase !== 'clear' ||
      (s.level < LEVELS.length - 1 && s.gems.every(Boolean))) &&
    (s.phase === 'failed' ? s.reason !== null : s.reason === null)
  );
}
