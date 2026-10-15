export interface Obstacle {
  id: number;
  x: number;
  y: number;
  kind: 'tree' | 'rock' | 'ramp';
}
export interface SkiState {
  version: 1;
  x: number;
  distance: number;
  speed: number;
  lives: number;
  bonus: number;
  jump: number;
  cooldown: number;
  grace: number;
  spawn: number;
  nextId: number;
  yetiGap: number;
  obstacles: Obstacle[];
}
export const newSkiState = (): SkiState => ({
  version: 1,
  x: 300,
  distance: 0,
  speed: 150,
  lives: 3,
  bonus: 0,
  jump: 0,
  cooldown: 0,
  grace: 0,
  spawn: 0,
  nextId: 1,
  yetiGap: 300,
  obstacles: [],
});
export function jumpSki(s: SkiState) {
  if (s.cooldown <= 0 && s.jump <= 0) {
    s.jump = 0.8;
    s.cooldown = 1.5;
    return true;
  }
  return false;
}
export function stepSki(
  s: SkiState,
  dt: number,
  steer: number,
  brake: boolean,
  random = Math.random,
) {
  dt = Math.max(0, Math.min(0.05, dt));
  steer = Math.max(-1, Math.min(1, steer));
  s.x = Math.max(30, Math.min(570, s.x + steer * 260 * dt));
  s.jump = Math.max(0, s.jump - dt);
  s.cooldown = Math.max(0, s.cooldown - dt);
  s.grace = Math.max(0, s.grace - dt);
  const desired = brake ? 95 : Math.min(350, 190 + s.distance / 12);
  s.speed += (desired - s.speed) * Math.min(1, dt * 1.3);
  s.distance += (s.speed * dt) / 8;
  s.spawn -= dt;
  if (s.spawn <= 0) {
    const roll = random();
    s.obstacles.push({
      id: s.nextId++,
      x: 40 + random() * 520,
      y: 850,
      kind: roll < 0.15 ? 'ramp' : roll < 0.7 ? 'tree' : 'rock',
    });
    s.spawn = Math.max(0.35, 0.85 - s.distance / 4000);
  }
  for (const o of s.obstacles) {
    o.y -= s.speed * dt;
    if (
      Math.abs(o.x - s.x) < (o.kind === 'tree' ? 25 : 29) &&
      Math.abs(o.y - 285) < 25
    ) {
      if (o.kind === 'ramp') {
        s.jump = 1.15;
        s.bonus += 100;
        o.y = -200;
      } else if (s.jump <= 0 && s.grace <= 0) {
        s.lives--;
        s.grace = 2;
        s.speed = 60;
        o.y = -200;
      }
    }
  }
  s.obstacles = s.obstacles.filter((o) => o.y > -100);
  if (s.distance >= 1000)
    s.yetiGap = Math.max(
      0,
      Math.min(360, s.yetiGap + (s.speed - 285) * dt * 0.42),
    );
}
export function isSkiState(v: unknown): v is SkiState {
  if (!v || typeof v !== 'object') return false;
  const s = v as SkiState;
  const n = (v: number, a: number, b: number) =>
    Number.isFinite(v) && v >= a && v <= b;
  return (
    s.version === 1 &&
    n(s.x, 30, 570) &&
    n(s.distance, 0, 2000) &&
    n(s.speed, 0, 350) &&
    Number.isInteger(s.lives) &&
    n(s.lives, 1, 3) &&
    Number.isInteger(s.bonus) &&
    n(s.bonus, 0, 1000000) &&
    n(s.jump, 0, 1.15) &&
    n(s.cooldown, 0, 1.5) &&
    n(s.grace, 0, 2) &&
    n(s.spawn, -0.1, 0.85) &&
    Number.isInteger(s.nextId) &&
    n(s.nextId, 1, 100000) &&
    n(s.yetiGap, 0.001, 360) &&
    Array.isArray(s.obstacles) &&
    s.obstacles.length < 50 &&
    s.obstacles.every(
      (o) =>
        o &&
        Number.isInteger(o.id) &&
        n(o.id, 1, s.nextId - 1) &&
        n(o.x, 40, 560) &&
        n(o.y, -100, 850) &&
        ['tree', 'rock', 'ramp'].includes(o.kind),
    ) &&
    new Set(s.obstacles.map((o) => o.id)).size === s.obstacles.length
  );
}
