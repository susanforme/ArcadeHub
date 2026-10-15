export const COLS = 15;
export const ROWS = 18;
export const STEP = 100;
export type Direction = 0 | 1 | 2 | 3;
const vectors = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
] as const;
export interface Enemy {
  x: number;
  y: number;
  kind: number;
  air: number;
  timer: number;
  fire: number;
  dir: Direction;
}
export interface Rock {
  x: number;
  y: number;
  timer: number;
  falling: boolean;
  hits: number;
}
export interface DigState {
  version: 1;
  level: number;
  score: number;
  lives: number;
  ticks: number;
  phase: 'ready' | 'playing' | 'clear' | 'over';
  delay: number;
  dirt: number[];
  player: { x: number; y: number; dir: Direction; invincible: number };
  enemies: Enemy[];
  rocks: Rock[];
  hose: number;
  bonus: boolean;
  dropped: number;
}
export function newDig(level = 1, score = 0, lives = 3): DigState {
  const dirt = Array.from({ length: COLS * ROWS }, (_, i) =>
    i < COLS * 2 ? 0 : 1,
  );
  const enemies: Enemy[] = [];
  for (let i = 0; i < Math.min(8, 3 + level); i++) {
    const x = 2 + ((i * 5 + level * 2) % 11),
      y = 5 + ((i * 3) % 11);
    enemies.push({
      x,
      y,
      kind: i % 3 === 2 ? 1 : 0,
      air: 0,
      timer: 0,
      fire: 0,
      dir: 0,
    });
    for (let dx = -1; dx <= 1; dx++) dirt[y * COLS + x + dx] = 0;
  }
  for (let y = 1; y <= 9; y++) dirt[y * COLS + 7] = 0;
  for (let x = 5; x <= 9; x++) dirt[9 * COLS + x] = 0;
  return {
    version: 1,
    level,
    score,
    lives,
    ticks: 0,
    phase: 'ready',
    delay: 0,
    dirt,
    player: { x: 7, y: 9, dir: 0, invincible: 20 },
    enemies,
    rocks: [
      { x: 3, y: 3, timer: 0, falling: false, hits: 0 },
      { x: 11, y: 7, timer: 0, falling: false, hits: 0 },
      { x: 5, y: 12, timer: 0, falling: false, hits: 0 },
    ],
    hose: 0,
    bonus: false,
    dropped: 0,
  };
}
function open(s: DigState, x: number, y: number) {
  return x >= 0 && x < COLS && y >= 1 && y < ROWS && !s.dirt[y * COLS + x];
}
function loseLife(s: DigState) {
  if (s.player.invincible > 0) return;
  s.lives--;
  if (!s.lives) {
    s.phase = 'over';
    return;
  }
  s.player = { x: 7, y: 1, dir: 1, invincible: 25 };
  s.hose = 0;
}
export function stepDig(
  s: DigState,
  input: { direction?: Direction; pump?: boolean; start?: boolean },
) {
  if (s.phase === 'over') return;
  if (s.phase === 'ready') {
    if (input.start || input.direction !== undefined || input.pump)
      s.phase = 'playing';
    else return;
  }
  if (s.phase === 'clear') {
    if (--s.delay <= 0)
      Object.assign(s, newDig(Math.min(s.level + 1, 999), s.score, s.lives));
    return;
  }
  s.ticks++;
  s.hose = 0;
  s.player.invincible = Math.max(0, s.player.invincible - 1);
  const p = s.player;
  if (input.direction !== undefined && s.ticks % 2 === 0) {
    p.dir = input.direction;
    const [dx, dy] = vectors[p.dir],
      x = p.x + dx,
      y = p.y + dy;
    if (
      x >= 0 &&
      x < COLS &&
      y >= 1 &&
      y < ROWS &&
      !s.rocks.some((r) => r.x === x && r.y === y)
    ) {
      p.x = x;
      p.y = y;
      s.dirt[y * COLS + x] = 0;
    }
  }
  if (input.pump) {
    const [dx, dy] = vectors[p.dir];
    for (let distance = 1; distance <= 3; distance++) {
      const x = p.x + dx * distance,
        y = p.y + dy * distance;
      if (!open(s, x, y)) break;
      s.hose = distance;
      const e = s.enemies.find((e) => e.x === x && e.y === y);
      if (e) {
        e.fire = 0;
        if (s.ticks % 3 === 0) {
          e.air++;
          e.timer = 18;
          if (e.air >= 4) {
            s.score += 200 + Math.floor(e.y / 5) * 100;
            s.enemies.splice(s.enemies.indexOf(e), 1);
          }
        }
        break;
      }
    }
  }
  for (const e of s.enemies) {
    if (e.air > 0) {
      if (--e.timer <= 0) {
        e.air--;
        e.timer = 12;
      }
      continue;
    }
    if (e.fire > 0) {
      e.fire--;
      if (
        p.y === e.y &&
        Math.sign(p.x - e.x) === (e.dir === 0 ? 1 : -1) &&
        Math.abs(p.x - e.x) <= 3
      )
        loseLife(s);
      continue;
    }
    if (
      e.kind &&
      s.ticks % 35 === 0 &&
      p.y === e.y &&
      Math.abs(p.x - e.x) <= 4
    ) {
      e.dir = p.x > e.x ? 0 : 2;
      e.fire = 6;
      continue;
    }
    if (s.ticks % Math.max(3, 7 - Math.floor(s.level / 3)) !== 0) continue;
    const choices = vectors
      .map(([dx, dy], dir) => ({
        x: e.x + dx,
        y: e.y + dy,
        dir: dir as Direction,
      }))
      .filter(
        (v) =>
          v.x >= 0 &&
          v.x < COLS &&
          v.y >= 1 &&
          v.y < ROWS &&
          !s.rocks.some((r) => r.x === v.x && r.y === v.y),
      );
    const ghost = s.ticks % 60 < 12;
    choices.sort(
      (a, b) =>
        Math.abs(a.x - p.x) +
        Math.abs(a.y - p.y) -
        (Math.abs(b.x - p.x) + Math.abs(b.y - p.y)),
    );
    const next = choices.find((v) => ghost || open(s, v.x, v.y));
    if (next) Object.assign(e, next);
  }
  for (const r of [...s.rocks]) {
    if (!r.falling) {
      if (open(s, r.x, r.y + 1) && !(p.x === r.x && p.y === r.y + 1)) {
        if (++r.timer >= 7) {
          r.falling = true;
          s.dropped++;
        }
      } else r.timer = 0;
    } else {
      const next = r.y + 1;
      if (!open(s, r.x, next)) {
        s.rocks.splice(s.rocks.indexOf(r), 1);
        continue;
      }
      r.y = next;
      if (p.x === r.x && p.y === r.y) loseLife(s);
      const crushed = s.enemies.filter((e) => e.x === r.x && e.y === r.y);
      for (const e of crushed) {
        r.hits++;
        s.score += r.hits * 500;
        s.enemies.splice(s.enemies.indexOf(e), 1);
      }
    }
  }
  if (s.enemies.some((e) => !e.air && e.x === p.x && e.y === p.y)) loseLife(s);
  if (s.dropped >= 2 && !s.bonus && p.x === 7 && p.y === 9) {
    s.bonus = true;
    s.score += 1000 * s.level;
  }
  if (!s.enemies.length && s.phase === 'playing') {
    s.phase = 'clear';
    s.delay = 18;
    s.score += 500;
  }
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
export function isDigState(v: unknown): v is DigState {
  if (
    !object(v) ||
    v.version !== 1 ||
    !object(v.player) ||
    !Array.isArray(v.dirt) ||
    !Array.isArray(v.enemies) ||
    !Array.isArray(v.rocks)
  )
    return false;
  const pos = (p: Record<string, unknown>) =>
    int(p.x, 0, COLS - 1) && int(p.y, 1, ROWS - 1);
  return (
    int(v.level, 1, 999) &&
    int(v.score, 0, 1e12) &&
    int(v.lives, 1, 3) &&
    int(v.ticks, 0, 1e12) &&
    ['ready', 'playing', 'clear'].includes(String(v.phase)) &&
    int(v.delay, 0, 18) &&
    v.dirt.length === COLS * ROWS &&
    v.dirt.every((x) => x === 0 || x === 1) &&
    pos(v.player) &&
    int(v.player.dir, 0, 3) &&
    int(v.player.invincible, 0, 25) &&
    v.enemies.length <= 8 &&
    v.enemies.every(
      (e) =>
        object(e) &&
        pos(e) &&
        int(e.kind, 0, 1) &&
        int(e.air, 0, 3) &&
        int(e.timer, 0, 18) &&
        int(e.fire, 0, 6) &&
        int(e.dir, 0, 3),
    ) &&
    v.rocks.length <= 3 &&
    v.rocks.every(
      (r) =>
        object(r) &&
        pos(r) &&
        int(r.timer, 0, 7) &&
        typeof r.falling === 'boolean' &&
        int(r.hits, 0, 8),
    ) &&
    int(v.hose, 0, 3) &&
    typeof v.bonus === 'boolean' &&
    int(v.dropped, 0, 3)
  );
}
