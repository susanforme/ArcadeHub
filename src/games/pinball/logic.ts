export const WIDTH = 480,
  HEIGHT = 720,
  BALL_RADIUS = 10;
export const BUMPERS = [
  { x: 160, y: 230, r: 30 },
  { x: 292, y: 230, r: 30 },
  { x: 226, y: 326, r: 34 },
];
export const TARGETS = [
  { x: 73, y: 180, r: 15 },
  { x: 226, y: 137, r: 15 },
  { x: 363, y: 180, r: 15 },
];
export const RAILS = [
  [30, 112, 30, 510],
  [30, 112, 350, 112],
  [350, 112, 450, 164],
  [450, 164, 450, 660],
  [398, 210, 398, 660],
  [30, 510, 115, 590],
  [398, 500, 365, 590],
  [30, 660, 145, 660],
  [340, 660, 450, 660],
  [86, 435, 130, 535],
  [364, 435, 320, 535],
];
export interface PinballState {
  version: 1;
  phase: 'ready' | 'playing' | 'over';
  score: number;
  balls: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  left: number;
  right: number;
  lit: boolean[];
  cooldowns: number[];
  bonus: number;
  elapsed: number;
}
export function newPinball(): PinballState {
  return {
    version: 1,
    phase: 'ready',
    score: 0,
    balls: 3,
    x: 425,
    y: 614,
    vx: 0,
    vy: 0,
    left: 0.38,
    right: Math.PI - 0.38,
    lit: [false, false, false],
    cooldowns: [0, 0, 0, 0, 0, 0],
    bonus: 0,
    elapsed: 0,
  };
}
export function launchBall(s: PinballState) {
  if (s.phase !== 'ready') return false;
  s.phase = 'playing';
  s.vy = -1080;
  s.vx = 0;
  return true;
}
export function flipper(side: number, angle: number) {
  const x = side === 0 ? 130 : 350,
    y = 590;
  return { x, y, ex: x + Math.cos(angle) * 94, ey: y + Math.sin(angle) * 94 };
}
function collideSegment(
  s: PinballState,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  radius = 4,
  restitution = 0.8,
  surfaceX = 0,
  surfaceY = 0,
) {
  const dx = bx - ax,
    dy = by - ay,
    t = Math.max(
      0,
      Math.min(1, ((s.x - ax) * dx + (s.y - ay) * dy) / (dx * dx + dy * dy)),
    );
  const px = ax + dx * t,
    py = ay + dy * t,
    dist = Math.hypot(s.x - px, s.y - py),
    r = BALL_RADIUS + radius;
  if (dist >= r) return false;
  const nx = dist > 0.001 ? (s.x - px) / dist : 0,
    ny = dist > 0.001 ? (s.y - py) / dist : -1;
  s.x = px + nx * r;
  s.y = py + ny * r;
  const speed = (s.vx - surfaceX) * nx + (s.vy - surfaceY) * ny;
  if (speed < 0) {
    s.vx -= (1 + restitution) * speed * nx;
    s.vy -= (1 + restitution) * speed * ny;
  }
  return speed < 0;
}
export function stepPinball(
  s: PinballState,
  seconds: number,
  input: { left: boolean; right: boolean },
) {
  if (s.phase === 'over') return;
  let remaining = Math.max(0, Math.min(0.1, seconds));
  while (remaining > 0) {
    const dt = Math.min(1 / 240, remaining);
    remaining -= dt;
    s.elapsed += dt;
    s.bonus = Math.max(0, s.bonus - dt);
    s.cooldowns = s.cooldowns.map((c) => Math.max(0, c - dt));
    const oldL = s.left,
      oldR = s.right;
    const approach = (v: number, target: number) =>
      v + Math.max(-14 * dt, Math.min(14 * dt, target - v));
    s.left = approach(s.left, input.left ? -0.52 : 0.38);
    s.right = approach(s.right, input.right ? Math.PI + 0.52 : Math.PI - 0.38);
    if (s.phase !== 'playing') continue;
    s.vy += 560 * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    for (let i = 0; i < RAILS.length; i++) {
      const [a, b, c, d] = RAILS[i];
      const struck = collideSegment(s, a, b, c, d);
      if (struck && i >= 9) {
        s.vy = Math.min(s.vy, -420);
        s.vx += (s.x < 240 ? 1 : -1) * 90;
      }
    }
    for (const [i, angle, old, held] of [
      [0, s.left, oldL, input.left],
      [1, s.right, oldR, input.right],
    ] as const) {
      const f = flipper(i, angle),
        omega = (angle - old) / dt;
      const surfaceX = -omega * (s.y - f.y),
        surfaceY = omega * (s.x - f.x);
      const hit = collideSegment(
        s,
        f.x,
        f.y,
        f.ex,
        f.ey,
        10,
        0.7,
        surfaceX,
        surfaceY,
      );
      if (hit && held && s.y < f.y + 16) {
        s.vy = Math.min(s.vy, -650);
        s.vx += (i === 0 ? 1 : -1) * 100;
      }
    }
    for (const [i, b] of [...BUMPERS, ...TARGETS].entries()) {
      const dx = s.x - b.x,
        dy = s.y - b.y,
        d = Math.hypot(dx, dy),
        r = b.r + BALL_RADIUS;
      if (d >= r) continue;
      const nx = d > 0.001 ? dx / d : 0,
        ny = d > 0.001 ? dy / d : 1;
      s.x = b.x + nx * r;
      s.y = b.y + ny * r;
      const speed = s.vx * nx + s.vy * ny;
      if (speed < 0) {
        s.vx -= 1.8 * speed * nx;
        s.vy -= 1.8 * speed * ny;
      }
      if (s.cooldowns[i] <= 0) {
        s.vx += nx * 170;
        s.vy += ny * 170;
        s.score += (i < 3 ? 100 : 250) * (s.bonus > 0 ? 2 : 1);
        s.cooldowns[i] = 0.18;
        if (i >= 3) {
          s.lit[i - 3] = true;
          if (s.lit.every(Boolean)) {
            s.score += 1000;
            s.bonus = 15;
            s.lit = [false, false, false];
          }
        }
      }
    }
    const speed = Math.hypot(s.vx, s.vy);
    if (speed > 1250) {
      s.vx = (s.vx / speed) * 1250;
      s.vy = (s.vy / speed) * 1250;
    }
    if (s.x > 412 && s.y >= 635 && s.vy >= -10) {
      s.phase = 'ready';
      s.x = 425;
      s.y = 614;
      s.vx = 0;
      s.vy = 0;
      break;
    }
    if (s.y > 700) {
      s.balls--;
      s.phase = s.balls > 0 ? 'ready' : 'over';
      s.x = 425;
      s.y = 614;
      s.vx = 0;
      s.vy = 0;
      break;
    }
  }
}
export function isPinballState(value: unknown): value is PinballState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PinballState;
  return (
    s.version === 1 &&
    ['ready', 'playing'].includes(s.phase) &&
    Number.isInteger(s.score) &&
    s.score >= 0 &&
    Number.isInteger(s.balls) &&
    s.balls >= 1 &&
    s.balls <= 3 &&
    [s.x, s.y, s.vx, s.vy, s.left, s.right, s.bonus, s.elapsed].every(
      Number.isFinite,
    ) &&
    s.x >= -20 &&
    s.x <= 500 &&
    s.y >= 70 &&
    s.y <= 701 &&
    Math.abs(s.vx) <= 1251 &&
    Math.abs(s.vy) <= 1251 &&
    s.left >= -0.53 &&
    s.left <= 0.39 &&
    s.right >= Math.PI - 0.39 &&
    s.right <= Math.PI + 0.53 &&
    s.bonus >= 0 &&
    s.bonus <= 15 &&
    s.elapsed >= 0 &&
    Array.isArray(s.lit) &&
    s.lit.length === 3 &&
    s.lit.every((v) => typeof v === 'boolean') &&
    Array.isArray(s.cooldowns) &&
    s.cooldowns.length === 6 &&
    s.cooldowns.every((v) => Number.isFinite(v) && v >= 0 && v <= 0.18) &&
    (s.phase !== 'ready' ||
      (s.x === 425 && s.y === 614 && s.vx === 0 && s.vy === 0))
  );
}
