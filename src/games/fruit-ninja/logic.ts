export const WIDTH = 800;
export const HEIGHT = 600;
export const MAX_LIVES = 3;
export const LIFE_SCORE = 100;
// The original game's exact probability and gesture tolerance are not published.
export const CRITICAL_CHANCE = 0.05;
const SWIPE_IDLE = 0.3;
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
export interface NinjaSwipe {
  combo: number;
  lastMove: number;
  direction: Point | null;
}
export function newNinjaSwipe(): NinjaSwipe {
  return { combo: 0, lastMove: 0, direction: null };
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
  if (length === 0) return false;
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
export function sliceNinja(
  state: NinjaState,
  from: Point,
  to: Point,
  random = Math.random,
  swipe = newNinjaSwipe(),
) {
  const result: {
    cut: Fruit[];
    bonus: number;
    bomb: Fruit | null;
    critical: Fruit[];
    recovered: number;
    combo: number;
  } = { cut: [], bonus: 0, bomb: null, critical: [], recovered: 0, combo: 0 };
  if (state.phase !== 'playing') return result;
  const direction = { x: to.x - from.x, y: to.y - from.y };
  if (direction.x === 0 && direction.y === 0) return result;
  if (
    state.elapsed - swipe.lastMove > SWIPE_IDLE ||
    (swipe.direction &&
      direction.x * swipe.direction.x + direction.y * swipe.direction.y < 0)
  )
    swipe.combo = 0;
  swipe.direction = direction;
  swipe.lastMove = state.elapsed;
  const hit = state.fruits.filter((fruit) =>
    intersects(from, to, fruit, RADIUS[fruit.kind]),
  );
  const bomb = hit.find((fruit) => fruit.kind === 'boom') ?? null;
  if (bomb) {
    state.phase = 'over';
    state.reason = 'bomb';
    result.bomb = bomb;
    return result;
  }
  if (!hit.length) return result;
  let bonus = 0;
  for (const _fruit of hit) {
    swipe.combo++;
    if (swipe.combo === 3) bonus += 3;
    else if (swipe.combo > 3) bonus++;
  }
  state.combo = swipe.combo;
  state.comboUntil = state.elapsed + SWIPE_IDLE;
  const critical = hit.filter(() => random() < CRITICAL_CHANCE);
  const previousScore = state.score;
  state.score += hit.length + bonus + critical.length * 10;
  const recovered = Math.min(
    state.misses,
    Math.floor(state.score / LIFE_SCORE) -
      Math.floor(previousScore / LIFE_SCORE),
  );
  state.misses -= recovered;
  const ids = new Set(hit.map((fruit) => fruit.id));
  state.fruits = state.fruits.filter((fruit) => !ids.has(fruit.id));
  return {
    ...result,
    cut: hit,
    bonus,
    critical,
    recovered,
    combo: swipe.combo,
  };
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
  state.misses = Math.min(MAX_LIVES, state.misses + missed.length);
  if (state.misses === MAX_LIVES) {
    state.phase = 'over';
    state.reason = 'miss';
    return missed;
  }
  state.spawnIn -= dt;
  if (state.spawnIn <= 0 && state.fruits.length < 12) {
    state.wave++;
    const maxCount = Math.min(6, 2 + Math.floor(state.wave / 5));
    const count = Math.min(
      16 - state.fruits.length,
      2 + Math.floor(random() * (maxCount - 1)),
    );
    const spread = 70 + random() * 38;
    const halfSpan = ((count - 1) * spread) / 2;
    const center = 70 + halfSpan + random() * (WIDTH - 140 - halfSpan * 2);
    const bombIndex =
      state.wave >= 3 && random() < Math.min(0.65, 0.25 + state.wave * 0.01)
        ? Math.floor(random() * count)
        : -1;
    for (let i = 0; i < count; i++) {
      const x = Math.max(
        70,
        Math.min(WIDTH - 70, center + (i - (count - 1) / 2) * spread),
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
    state.spawnIn = Math.max(0.85, 2 - state.wave * 0.025) + random() * 0.3;
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
    !integer(s.misses, 0, MAX_LIVES - 1) ||
    !integer(s.wave, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(s.nextId, 1, Number.MAX_SAFE_INTEGER) ||
    !finite(s.elapsed, 0, Number.MAX_SAFE_INTEGER) ||
    !finite(s.spawnIn, -1, 2.3) ||
    !integer(s.combo, 0, s.nextId) ||
    !finite(s.comboUntil, 0, s.elapsed + SWIPE_IDLE + 0.01) ||
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
