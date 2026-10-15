export const WIDTH = 480,
  HEIGHT = 640,
  STEP = 1000 / 60,
  BASE = 1760,
  TILE = 30;
export interface Climber {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dir: number;
  grounded: boolean;
  hammer: number;
  invincible: number;
  checkpoint: number;
}
export interface IceEnemy {
  x: number;
  y: number;
  dir: number;
  floor: number;
  alive: boolean;
}
export interface IceState {
  version: 1;
  level: number;
  score: number;
  lives: number;
  ticks: number;
  phase: 'ready' | 'playing' | 'clear' | 'over';
  delay: number;
  camera: number;
  players: Climber[];
  floors: number[][];
  enemies: IceEnemy[];
  fruit: boolean[];
  clouds: { x: number; y: number; dir: number }[];
}
export interface IceInput {
  left?: boolean;
  right?: boolean;
  jump?: boolean;
  hit?: boolean;
  join?: boolean;
  start?: boolean;
}
function player(x: number, y = BASE): Climber {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    dir: 1,
    grounded: true,
    hammer: 0,
    invincible: 100,
    checkpoint: 0,
  };
}
export function newIce(level = 1, score = 0, lives = 3, players = 1): IceState {
  const floors = Array.from({ length: 15 }, (_, f) =>
    Array.from({ length: 16 }, (_, x) =>
      f === 0
        ? 2
        : x === 0 || x === 15
          ? 2
          : x === ((f * 3 + level) % 11) + 2
            ? 0
            : 1,
    ),
  );
  return {
    version: 1,
    level,
    score,
    lives,
    ticks: 0,
    phase: 'ready',
    delay: 0,
    camera: BASE - HEIGHT + 70,
    players: Array.from({ length: players }, (_, i) => player(210 + i * 60)),
    floors,
    enemies: Array.from({ length: 7 }, (_, i) => ({
      x: 80 + (i % 3) * 100,
      y: BASE - (i * 2 + 1) * 100,
      dir: i % 2 ? 1 : -1,
      floor: i * 2 + 1,
      alive: true,
    })),
    fruit: Array(15).fill(false),
    clouds: [
      { x: 80, y: BASE - 450, dir: 1 },
      { x: 280, y: BASE - 850, dir: -1 },
      { x: 150, y: BASE - 1250, dir: 1 },
    ],
  };
}
function solid(s: IceState, f: number, x: number) {
  return x >= 0 && x < WIDTH && s.floors[f]?.[Math.floor(x / TILE)] > 0;
}
function hitPlayer(s: IceState, p: Climber) {
  if (p.invincible > 0 || s.phase === 'over') return;
  s.lives--;
  if (s.lives <= 0) {
    s.phase = 'over';
    return;
  }
  const f = Math.max(
    p.checkpoint,
    Math.min(14, Math.ceil((BASE - s.camera - HEIGHT + 80) / 100)),
  );
  p.x = 15;
  p.y = BASE - f * 100;
  p.vx = 0;
  p.vy = 0;
  p.grounded = true;
  p.invincible = 120;
}
export function stepIce(s: IceState, inputs: IceInput[]) {
  if (s.phase === 'over') return;
  if (inputs[0]?.join && s.players.length === 1) {
    const p = s.players[0];
    s.players.push({
      ...player(Math.min(WIDTH - 24, p.x + 35), p.y),
      checkpoint: p.checkpoint,
      grounded: p.grounded,
    });
  }
  if (s.phase === 'ready') {
    if (inputs.some((i) => i.start || i.jump || i.hit || i.left || i.right))
      s.phase = 'playing';
    else return;
  }
  if (s.phase === 'clear') {
    if (--s.delay <= 0)
      Object.assign(
        s,
        newIce(Math.min(999, s.level + 1), s.score, s.lives, s.players.length),
      );
    return;
  }
  s.ticks++;
  for (const c of s.clouds) {
    c.x += c.dir * (0.7 + Math.min(s.level, 10) * 0.03);
    if (c.x < 20 || c.x > WIDTH - 100) c.dir *= -1;
  }
  for (let index = 0; index < s.players.length; index++) {
    const p = s.players[index],
      input = inputs[index] ?? {},
      previousY = p.y;
    p.invincible = Math.max(0, p.invincible - 1);
    p.hammer = Math.max(0, p.hammer - 1);
    const horizontal = Number(!!input.right) - Number(!!input.left);
    p.vx = horizontal ? horizontal * 2.6 : p.vx * 0.75;
    if (horizontal) p.dir = horizontal;
    if (input.hit && p.hammer === 0) p.hammer = 15;
    if (input.jump && p.grounded) {
      p.vy = -10.8;
      p.grounded = false;
    }
    p.x = Math.max(14, Math.min(WIDTH - 14, p.x + p.vx));
    p.vy = Math.min(12, p.vy + 0.4);
    p.y += p.vy;
    p.grounded = false;
    for (let f = 0; f < s.floors.length; f++) {
      const y = BASE - f * 100;
      if (p.vy < 0 && previousY - 30 >= y + 14 && p.y - 30 <= y + 14) {
        for (const x of [p.x - 11, p.x + 11]) {
          const tile = Math.floor(x / TILE);
          if (s.floors[f][tile] === 1) {
            s.floors[f][tile] = 0;
            s.score += 10;
            p.hammer = 10;
          } else if (s.floors[f][tile] === 2) {
            p.y = y + 44;
            p.vy = 1;
          }
        }
      }
      if (
        p.vy >= 0 &&
        previousY <= y &&
        p.y >= y &&
        (solid(s, f, p.x - 9) || solid(s, f, p.x + 9))
      ) {
        p.y = y;
        p.vy = 0;
        p.grounded = true;
        p.checkpoint = Math.max(p.checkpoint, f);
      }
    }
    for (const c of s.clouds)
      if (
        p.vy >= 0 &&
        previousY <= c.y &&
        p.y >= c.y &&
        p.x > c.x - 8 &&
        p.x < c.x + 88
      ) {
        p.y = c.y;
        p.vy = 0;
        p.grounded = true;
        p.x += c.dir * 0.7;
      }
    const floor = Math.round((BASE - p.y) / 100),
      fruitX = 75 + ((floor * 73) % 320);
    if (
      floor > 0 &&
      floor < 15 &&
      !s.fruit[floor] &&
      Math.abs(p.y - (BASE - floor * 100)) < 25 &&
      Math.abs(p.x - fruitX) < 23
    ) {
      s.fruit[floor] = true;
      s.score += 300;
    }
    for (const e of s.enemies) {
      if (!e.alive || Math.abs(e.y - p.y) > 25) continue;
      const distance = e.x - p.x;
      if (
        p.hammer &&
        Math.abs(distance) < 54 &&
        Math.sign(distance) === p.dir
      ) {
        e.alive = false;
        s.score += 400;
      } else if (Math.abs(distance) < 22) hitPlayer(s, p);
    }
    if (p.y > s.camera + HEIGHT + 30) {
      p.invincible = 0;
      hitPlayer(s, p);
    }
    if (p.checkpoint === 14 && s.phase === 'playing') {
      s.score += 3000;
      s.phase = 'clear';
      s.delay = 120;
    }
  }
  const target = Math.min(...s.players.map((p) => p.y)) - HEIGHT * 0.62;
  s.camera = Math.max(200, Math.min(s.camera, target));
  for (const e of s.enemies) {
    if (!e.alive) continue;
    const speed = 0.65 + Math.min(s.level, 12) * 0.08;
    e.x += e.dir * speed;
    if (e.x < 35 || e.x > WIDTH - 35) e.dir *= -1;
    const tile = Math.floor(e.x / TILE);
    if (s.floors[e.floor][tile] === 0 && s.ticks % 90 === 0)
      s.floors[e.floor][tile] = 1;
  }
}
const rec = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, a: number, b: number) =>
  typeof v === 'number' && Number.isFinite(v) && v >= a && v <= b;
const int = (v: unknown, a: number, b: number) =>
  num(v, a, b) && Number.isInteger(v);
export function isIceState(v: unknown): v is IceState {
  if (
    !rec(v) ||
    v.version !== 1 ||
    !Array.isArray(v.players) ||
    !Array.isArray(v.floors) ||
    !Array.isArray(v.enemies) ||
    !Array.isArray(v.fruit) ||
    !Array.isArray(v.clouds)
  )
    return false;
  return (
    int(v.level, 1, 999) &&
    int(v.score, 0, 1e12) &&
    int(v.lives, 1, 3) &&
    int(v.ticks, 0, 1e12) &&
    ['ready', 'playing', 'clear'].includes(String(v.phase)) &&
    int(v.delay, 0, 120) &&
    num(v.camera, 200, 1190) &&
    v.players.length >= 1 &&
    v.players.length <= 2 &&
    v.players.every(
      (p) =>
        rec(p) &&
        num(p.x, 0, WIDTH) &&
        num(p.y, 0, 2000) &&
        num(p.vx, -3, 3) &&
        num(p.vy, -11, 12) &&
        (p.dir === 1 || p.dir === -1) &&
        typeof p.grounded === 'boolean' &&
        int(p.hammer, 0, 15) &&
        int(p.invincible, 0, 120) &&
        int(p.checkpoint, 0, 14),
    ) &&
    v.floors.length === 15 &&
    v.floors.every(
      (f) =>
        Array.isArray(f) &&
        f.length === 16 &&
        f.every((x) => x === 0 || x === 1 || x === 2),
    ) &&
    v.enemies.length === 7 &&
    v.enemies.every(
      (e) =>
        rec(e) &&
        num(e.x, 0, WIDTH) &&
        num(e.y, 0, BASE) &&
        int(e.floor, 1, 13) &&
        (e.dir === 1 || e.dir === -1) &&
        typeof e.alive === 'boolean',
    ) &&
    v.fruit.length === 15 &&
    v.fruit.every((f) => typeof f === 'boolean') &&
    v.clouds.length === 3 &&
    v.clouds.every(
      (c) =>
        rec(c) &&
        num(c.x, 0, WIDTH) &&
        num(c.y, 0, BASE) &&
        (c.dir === 1 || c.dir === -1),
    )
  );
}
