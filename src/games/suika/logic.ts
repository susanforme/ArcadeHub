export const WIDTH = 480;
export const HEIGHT = 720;
export const LEFT = 30;
export const RIGHT = 450;
export const FLOOR = 644;
export const LIMIT = 160;
export const RADII = [14, 20, 26, 32, 39, 47, 56, 66, 77, 89, 102];
export interface Fruit {
  id: number;
  kind: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
}
export interface SuikaState {
  version: 1;
  fruits: Fruit[];
  score: number;
  seed: number;
  nextId: number;
  current: number;
  next: number;
  aim: number;
  cooldown: number;
  overflow: number;
  over: boolean;
}
function random(s: SuikaState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((s.seed / 4294967296) * 5);
}
export function newSuika(seed = Date.now() >>> 0): SuikaState {
  const s: SuikaState = {
    version: 1,
    fruits: [],
    score: 0,
    seed,
    nextId: 1,
    current: 0,
    next: 0,
    aim: 240,
    cooldown: 0,
    overflow: 0,
    over: false,
  };
  s.current = random(s);
  s.next = random(s);
  return s;
}
export function aimSuika(s: SuikaState, x: number) {
  const r = RADII[s.current];
  s.aim = Math.max(LEFT + r, Math.min(RIGHT - r, x));
}
export function dropFruit(s: SuikaState) {
  if (s.over || s.cooldown > 0 || s.fruits.length >= 200) return false;
  aimSuika(s, s.aim);
  s.fruits.push({
    id: s.nextId++,
    kind: s.current,
    x: s.aim,
    y: 112,
    vx: 0,
    vy: 0,
    age: 0,
  });
  s.current = s.next;
  s.next = random(s);
  s.cooldown = 0.5;
  return true;
}
export function stepSuika(s: SuikaState, seconds: number) {
  if (s.over) return;
  let remaining = Math.max(0, Math.min(seconds, 0.1));
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    remaining -= dt;
    s.cooldown = Math.max(0, s.cooldown - dt);
    for (const f of s.fruits) {
      f.age += dt;
      f.vy = Math.min(700, f.vy + 760 * dt);
      f.vx *= Math.exp(-0.6 * dt);
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    }
    const removed = new Set<number>();
    const additions: Fruit[] = [];
    for (let pass = 0; pass < 8; pass++) {
      for (const f of s.fruits) {
        if (removed.has(f.id)) continue;
        const r = RADII[f.kind];
        if (f.x < LEFT + r) {
          f.x = LEFT + r;
          f.vx = Math.abs(f.vx) * 0.15;
        }
        if (f.x > RIGHT - r) {
          f.x = RIGHT - r;
          f.vx = -Math.abs(f.vx) * 0.15;
        }
        if (f.y > FLOOR - r) {
          f.y = FLOOR - r;
          if (f.vy > 0) f.vy = f.vy > 40 ? -f.vy * 0.12 : 0;
          f.vx *= 0.94;
        }
      }
      for (let i = 0; i < s.fruits.length; i++)
        for (let j = i + 1; j < s.fruits.length; j++) {
          const a = s.fruits[i],
            b = s.fruits[j];
          if (removed.has(a.id) || removed.has(b.id)) continue;
          const ra = RADII[a.kind],
            rb = RADII[b.kind],
            dx = b.x - a.x,
            dy = b.y - a.y,
            d = Math.hypot(dx, dy);
          if (d >= ra + rb) continue;
          if (a.kind === b.kind && a.kind < 10) {
            removed.add(a.id);
            removed.add(b.id);
            const kind = a.kind + 1;
            additions.push({
              id: s.nextId++,
              kind,
              x: (a.x + b.x) / 2,
              y: (a.y + b.y) / 2,
              vx: (a.vx + b.vx) / 2,
              vy: (a.vy + b.vy) / 2,
              age: Math.min(a.age, b.age),
            });
            s.score += ((kind + 1) * (kind + 2)) / 2;
            continue;
          }
          const nx = d > 0.001 ? dx / d : 1,
            ny = d > 0.001 ? dy / d : 0,
            ia = 1 / (ra * ra),
            ib = 1 / (rb * rb),
            total = ia + ib;
          const overlap = ra + rb - d;
          a.x -= (nx * overlap * ia) / total;
          a.y -= (ny * overlap * ia) / total;
          b.x += (nx * overlap * ib) / total;
          b.y += (ny * overlap * ib) / total;
          const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (speed < 0) {
            const impulse = (-(speed < -35 ? 1.12 : 1) * speed) / total;
            a.vx -= impulse * ia * nx;
            a.vy -= impulse * ia * ny;
            b.vx += impulse * ib * nx;
            b.vy += impulse * ib * ny;
          }
        }
    }
    s.fruits = s.fruits.filter((f) => !removed.has(f.id)).concat(additions);
    const high = s.fruits.some(
      (f) => f.age > 1.5 && f.y - RADII[f.kind] < LIMIT,
    );
    s.overflow = high ? s.overflow + dt : 0;
    if (s.overflow >= 2) {
      s.overflow = 2;
      s.over = true;
      break;
    }
  }
}
export function isSuikaState(value: unknown): value is SuikaState {
  if (!value || typeof value !== 'object') return false;
  const s = value as SuikaState;
  if (
    s.version !== 1 ||
    s.over !== false ||
    !Array.isArray(s.fruits) ||
    s.fruits.length > 200
  )
    return false;
  if (
    ![s.score, s.seed, s.nextId, s.current, s.next].every(Number.isInteger) ||
    s.score < 0 ||
    s.seed < 0 ||
    s.seed > 4294967295 ||
    s.nextId < 1 ||
    s.current < 0 ||
    s.current > 4 ||
    s.next < 0 ||
    s.next > 4
  )
    return false;
  if (
    ![s.aim, s.cooldown, s.overflow].every(Number.isFinite) ||
    s.aim < LEFT ||
    s.aim > RIGHT ||
    s.cooldown < 0 ||
    s.cooldown > 0.5 ||
    s.overflow < 0 ||
    s.overflow >= 2
  )
    return false;
  const ids = new Set<number>();
  return s.fruits.every((f) => {
    if (
      !f ||
      !Number.isInteger(f.id) ||
      f.id < 1 ||
      f.id >= s.nextId ||
      ids.has(f.id) ||
      !Number.isInteger(f.kind) ||
      f.kind < 0 ||
      f.kind > 10
    )
      return false;
    ids.add(f.id);
    return (
      [f.x, f.y, f.vx, f.vy, f.age].every(Number.isFinite) &&
      f.x >= LEFT - 110 &&
      f.x <= RIGHT + 110 &&
      f.y >= -200 &&
      f.y <= FLOOR + 110 &&
      Math.abs(f.vx) < 3000 &&
      Math.abs(f.vy) < 3000 &&
      f.age >= 0
    );
  });
}
