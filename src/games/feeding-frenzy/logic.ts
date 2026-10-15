export interface Fish {
  id: number;
  x: number;
  y: number;
  size: number;
  vx: number;
  phase: number;
}
export interface FeedingState {
  version: 1;
  x: number;
  y: number;
  eaten: number;
  score: number;
  lives: number;
  seconds: number;
  spawn: number;
  nextId: number;
  grace: number;
  fish: Fish[];
}
export const fishSize = (eaten: number) =>
  52 + Math.min(4, Math.floor(eaten / 10)) * 16;
export const feedingStage = (eaten: number) =>
  Math.min(5, 1 + Math.floor(eaten / 10));
export const newFeedingState = (): FeedingState => ({
  version: 1,
  x: 300,
  y: 350,
  eaten: 0,
  score: 0,
  lives: 3,
  seconds: 150,
  spawn: 0,
  nextId: 7,
  grace: 2,
  fish: Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    x: i < 3 ? 90 : 510,
    y: 190 + (i % 3) * 210,
    size: i % 3 === 2 ? 85 : 35,
    vx: i < 3 ? 50 : -50,
    phase: i,
  })),
});
export function stepFeeding(
  s: FeedingState,
  dt: number,
  target: { x: number; y: number },
  random = Math.random,
) {
  dt = Math.min(0.05, Math.max(0, dt));
  s.seconds = Math.max(0, s.seconds - dt);
  s.grace = Math.max(0, s.grace - dt);
  const dx = target.x - s.x,
    dy = target.y - s.y,
    distance = Math.hypot(dx, dy),
    move = Math.min(distance, dt * 290);
  if (distance) {
    s.x += (dx / distance) * move;
    s.y += (dy / distance) * move;
  }
  s.x = Math.max(35, Math.min(565, s.x));
  s.y = Math.max(140, Math.min(690, s.y));
  s.spawn = Math.max(0, s.spawn - dt);
  if (s.spawn <= 0 && s.fish.length < 22) {
    const dir = random() < 0.5 ? 1 : -1,
      size =
        fishSize(s.eaten) *
        (random() < 0.66 ? 0.45 + random() * 0.38 : 1.3 + random() * 0.65);
    s.fish.push({
      id: s.nextId++,
      x: dir > 0 ? -100 : 700,
      y: 150 + random() * 520,
      size,
      vx: dir * (45 + random() * 60 + feedingStage(s.eaten) * 7),
      phase: random() * Math.PI * 2,
    });
    s.spawn = 0.55;
  }
  for (const f of s.fish) {
    f.x += f.vx * dt;
    f.phase += dt * 2;
    f.y = Math.max(145, Math.min(685, f.y + Math.sin(f.phase) * dt * 13));
    if (
      Math.hypot(f.x - s.x, (f.y - s.y) * 1.5) >
      (f.size + fishSize(s.eaten)) * 0.34
    )
      continue;
    if (f.size < fishSize(s.eaten)) {
      s.eaten++;
      s.score += 50 * feedingStage(s.eaten);
      f.x = -1000;
    } else if (!s.grace) {
      s.lives--;
      s.grace = 2.5;
      f.x = -1000;
    }
  }
  s.fish = s.fish.filter((f) => f.x > -150 && f.x < 750);
}
export function isFeedingState(v: unknown): v is FeedingState {
  if (!v || typeof v !== 'object') return false;
  const s = v as FeedingState;
  const bounded = (n: number, a: number, b: number) =>
    Number.isFinite(n) && n >= a && n <= b;
  return (
    s.version === 1 &&
    bounded(s.x, 35, 565) &&
    bounded(s.y, 140, 690) &&
    Number.isInteger(s.eaten) &&
    bounded(s.eaten, 0, 49) &&
    Number.isInteger(s.score) &&
    bounded(s.score, 0, 1000000) &&
    Number.isInteger(s.lives) &&
    bounded(s.lives, 1, 3) &&
    bounded(s.seconds, 0.001, 150) &&
    bounded(s.spawn, -0.1, 1) &&
    bounded(s.grace, 0, 2.5) &&
    Number.isInteger(s.nextId) &&
    bounded(s.nextId, 1, 100000) &&
    Array.isArray(s.fish) &&
    s.fish.length <= 22 &&
    s.fish.every(
      (f) =>
        f &&
        Number.isInteger(f.id) &&
        f.id > 0 &&
        f.id < s.nextId &&
        bounded(f.x, -150, 750) &&
        bounded(f.y, 140, 690) &&
        bounded(f.size, 10, 240) &&
        bounded(Math.abs(f.vx), 1, 200) &&
        bounded(f.phase, 0, 10000),
    ) &&
    new Set(s.fish.map((f) => f.id)).size === s.fish.length
  );
}
