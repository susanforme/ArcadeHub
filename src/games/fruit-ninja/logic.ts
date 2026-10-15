export const WIDTH = 800;
export const HEIGHT = 600;
export const FRUITS = ['apple', 'banana', 'basaha', 'peach', 'sandia'] as const;
export type FruitKind = (typeof FRUITS)[number];
export interface Point {
  x: number;
  y: number;
}
export interface Fruit extends Point {
  id: number;
  kind: FruitKind | 'boom';
  vx: number;
  vy: number;
  angle: number;
  spin: number;
}
export interface NinjaState {
  version: 1;
  phase: 'ready' | 'playing' | 'over';
  score: number;
  misses: number;
  wave: number;
  elapsed: number;
  spawnIn: number;
  nextId: number;
  combo: number;
  comboUntil: number;
  fruits: Fruit[];
  reason: 'bomb' | 'miss' | null;
}
export const RADIUS: Record<Fruit['kind'], number> = {
  apple: 35,
  banana: 44,
  basaha: 36,
  peach: 34,
  sandia: 46,
  boom: 32,
};
export function newNinja(): NinjaState {
  return {
    version: 1,
    phase: 'ready',
    score: 0,
    misses: 0,
    wave: 0,
    elapsed: 0,
    spawnIn: 0.35,
    nextId: 1,
    combo: 0,
    comboUntil: 0,
    fruits: [],
    reason: null,
  };
}
export function startNinja(state: NinjaState) {
  if (state.phase !== 'ready') return false;
  state.phase = 'playing';
  return true;
}
export function intersects(
  from: Point,
  to: Point,
  center: Point,
  radius: number,
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = dx * dx + dy * dy;
  if (length < 4) return false;
  const along = Math.max(
    0,
    Math.min(1, ((center.x - from.x) * dx + (center.y - from.y) * dy) / length),
  );
  return (
    (from.x + along * dx - center.x) ** 2 +
      (from.y + along * dy - center.y) ** 2 <=
    radius ** 2
  );
}
export function sliceNinja(state: NinjaState, from: Point, to: Point) {
  if (state.phase !== 'playing') return { cut: [], bonus: 0, bomb: null };
  const hit = state.fruits.filter((fruit) =>
    intersects(from, to, fruit, RADIUS[fruit.kind]),
  );
  const bomb = hit.find((fruit) => fruit.kind === 'boom') ?? null;
  if (bomb) {
    state.phase = 'over';
    state.reason = 'bomb';
    return { cut: [], bonus: 0, bomb };
  }
  if (!hit.length) return { cut: [], bonus: 0, bomb: null };
  if (state.elapsed > state.comboUntil) state.combo = 0;
  let bonus = 0;
  for (const _fruit of hit) {
    state.combo++;
    if (state.combo === 3) bonus += 3;
    else if (state.combo > 3) bonus++;
  }
  state.comboUntil = state.elapsed + 0.14;
  state.score += hit.length + bonus;
  const ids = new Set(hit.map((fruit) => fruit.id));
  state.fruits = state.fruits.filter((fruit) => !ids.has(fruit.id));
  return { cut: hit, bonus, bomb: null };
}
export function stepNinja(state: NinjaState, dt: number, random = Math.random) {
  if (state.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return [];
  state.elapsed += dt;
  const missed: Fruit[] = [];
  for (const fruit of state.fruits) {
    fruit.x += fruit.vx * dt;
    fruit.y += fruit.vy * dt + 500 * dt * dt;
    fruit.vy += 1000 * dt;
    fruit.angle += fruit.spin * dt;
    if (fruit.vy > 0 && fruit.y > HEIGHT + 70 && fruit.kind !== 'boom')
      missed.push(fruit);
  }
  state.fruits = state.fruits.filter(
    (fruit) => fruit.y <= HEIGHT + 70 || fruit.vy <= 0,
  );
  state.misses = Math.min(3, state.misses + missed.length);
  if (state.misses === 3) {
    state.phase = 'over';
    state.reason = 'miss';
    return missed;
  }
  state.spawnIn -= dt;
  if (state.spawnIn <= 0 && state.fruits.length < 12) {
    state.wave++;
    const count = Math.min(5, 2 + Math.floor(state.wave / 5));
    const center = 160 + random() * 480;
    const bombIndex =
      state.wave >= 3 && random() < Math.min(0.65, 0.25 + state.wave * 0.01)
        ? Math.floor(random() * count)
        : -1;
    for (let i = 0; i < count; i++) {
      const x = Math.max(
        70,
        Math.min(WIDTH - 70, center + (i - (count - 1) / 2) * 108),
      );
      state.fruits.push({
        id: state.nextId++,
        kind:
          i === bombIndex
            ? 'boom'
            : FRUITS[Math.floor(random() * FRUITS.length)],
        x,
        y: HEIGHT + 60 + random() * 15,
        vx: (WIDTH / 2 - x) * 0.14 + (random() - 0.5) * 42,
        vy: -780 - random() * 120 - Math.min(35, state.wave),
        angle: random() * 360,
        spin: (random() - 0.5) * 220,
      });
    }
    state.spawnIn = Math.max(1.15, 2.3 - state.wave * 0.025);
  }
  return missed;
}
export function isNinjaState(value: unknown): value is NinjaState {
  if (!value || typeof value !== 'object') return false;
  const s = value as NinjaState;
  const finite = (n: unknown, min: number, max: number): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const integer = (n: unknown, min: number, max: number) =>
    finite(n, min, max) && Number.isInteger(n);
  if (
    s.version !== 1 ||
    !['ready', 'playing'].includes(s.phase) ||
    s.reason !== null ||
    !integer(s.score, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(s.misses, 0, 2) ||
    !integer(s.wave, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(s.nextId, 1, Number.MAX_SAFE_INTEGER) ||
    !finite(s.elapsed, 0, Number.MAX_SAFE_INTEGER) ||
    !finite(s.spawnIn, -1, 2.3) ||
    !integer(s.combo, 0, s.nextId) ||
    !finite(s.comboUntil, 0, s.elapsed + 0.15) ||
    !Array.isArray(s.fruits) ||
    s.fruits.length > 16
  )
    return false;
  if (
    s.phase === 'ready' &&
    (s.score !== 0 || s.misses !== 0 || s.wave !== 0 || s.fruits.length !== 0)
  )
    return false;
  const ids = new Set<number>();
  return s.fruits.every((fruit) => {
    if (
      !fruit ||
      ![...FRUITS, 'boom'].includes(fruit.kind) ||
      !integer(fruit.id, 1, s.nextId - 1) ||
      ids.has(fruit.id) ||
      !finite(fruit.x, -200, WIDTH + 200) ||
      !finite(fruit.y, -200, HEIGHT + 80) ||
      !finite(fruit.vx, -200, 200) ||
      !finite(fruit.vy, -1000, 1500) ||
      !finite(fruit.angle, -100000, 100000) ||
      !finite(fruit.spin, -110, 110)
    )
      return false;
    ids.add(fruit.id);
    return true;
  });
}
