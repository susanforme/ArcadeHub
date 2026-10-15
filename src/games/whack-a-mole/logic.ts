export const LEVELS = [
  { time: 30, goal: 160, interval: 0.95, lifetime: 1.65, capacity: 2 },
  { time: 30, goal: 240, interval: 0.8, lifetime: 1.45, capacity: 2 },
  { time: 35, goal: 340, interval: 0.7, lifetime: 1.25, capacity: 3 },
  { time: 35, goal: 420, interval: 0.6, lifetime: 1.1, capacity: 3 },
  { time: 40, goal: 540, interval: 0.5, lifetime: 0.95, capacity: 3 },
] as const;

export type Kind = 'mole' | 'gold' | 'bomb';
export interface Target {
  kind: Kind;
  remaining: number;
  lifetime: number;
}
export interface MoleState {
  version: 1;
  level: number;
  phase: 'ready' | 'playing' | 'clear' | 'won' | 'over';
  score: number;
  roundScore: number;
  lives: number;
  combo: number;
  hits: number;
  misses: number;
  remaining: number;
  spawnIn: number;
  holes: (Target | null)[];
}
export function newMole(): MoleState {
  return {
    version: 1,
    level: 1,
    phase: 'ready',
    score: 0,
    roundScore: 0,
    lives: 5,
    combo: 0,
    hits: 0,
    misses: 0,
    remaining: LEVELS[0].time,
    spawnIn: 0.35,
    holes: Array(9).fill(null),
  };
}
export function startRound(s: MoleState) {
  if (s.phase === 'clear') {
    s.level++;
    s.lives = Math.min(5, s.lives + 1);
    s.roundScore = 0;
    s.combo = 0;
    s.remaining = LEVELS[s.level - 1].time;
  } else if (s.phase !== 'ready') return false;
  s.holes.fill(null);
  s.spawnIn = 0.35;
  s.phase = 'playing';
  return true;
}
function endRound(s: MoleState) {
  if (s.lives === 0 || s.roundScore < LEVELS[s.level - 1].goal)
    s.phase = 'over';
  else s.phase = s.level === LEVELS.length ? 'won' : 'clear';
  s.holes.fill(null);
}
export function whack(s: MoleState, index: number) {
  if (s.phase !== 'playing' || !Number.isInteger(index)) return null;
  const target = s.holes[index];
  if (!target) {
    if (index >= 0 && index < 9) s.combo = 0;
    return null;
  }
  s.holes[index] = null;
  if (target.kind === 'bomb') {
    s.lives = Math.max(0, s.lives - 1);
    s.combo = 0;
    s.misses++;
    if (s.lives === 0) endRound(s);
    return { kind: target.kind, points: 0 };
  }
  s.combo++;
  s.hits++;
  const points =
    (target.kind === 'gold' ? 30 : 10) +
    Math.min(20, Math.floor((s.combo - 1) / 5) * 5);
  s.roundScore += points;
  s.score += points;
  return { kind: target.kind, points };
}
export function stepMole(s: MoleState, seconds: number, random = Math.random) {
  const escaped: number[] = [];
  if (s.phase !== 'playing' || !Number.isFinite(seconds) || seconds <= 0)
    return escaped;
  const dt = Math.min(seconds, s.remaining);
  s.remaining = Math.max(0, s.remaining - dt);
  // At the bell, visible targets leave without an extra missed-mole penalty.
  if (s.remaining <= 0) {
    endRound(s);
    return escaped;
  }
  for (let i = 0; i < 9; i++) {
    const target = s.holes[i];
    if (!target) continue;
    target.remaining -= dt;
    if (target.remaining > 0) continue;
    s.holes[i] = null;
    if (target.kind === 'bomb') continue;
    s.combo = 0;
    if (target.kind === 'gold') continue;
    s.misses++;
    s.lives = Math.max(0, s.lives - 1);
    escaped.push(i);
  }
  if (s.lives === 0) {
    endRound(s);
    return escaped;
  }
  const config = LEVELS[s.level - 1];
  s.spawnIn -= dt;
  if (s.spawnIn <= 0) {
    s.spawnIn = config.interval;
    const empty = s.holes.flatMap((hole, i) => (hole === null ? [i] : []));
    if (9 - empty.length < config.capacity) {
      const index = empty[Math.floor(random() * empty.length)];
      const roll = random();
      const kind: Kind = roll < 0.12 ? 'gold' : roll > 0.82 ? 'bomb' : 'mole';
      s.holes[index] = {
        kind,
        remaining: config.lifetime,
        lifetime: config.lifetime,
      };
    }
  }
  return escaped;
}
export function isMoleState(value: unknown): value is MoleState {
  if (!value || typeof value !== 'object') return false;
  const s = value as MoleState;
  const integer = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
    Number.isSafeInteger(n) && (n as number) >= min && (n as number) <= max;
  if (
    s.version !== 1 ||
    !integer(s.level, 1, LEVELS.length) ||
    !['ready', 'playing', 'clear'].includes(s.phase) ||
    !integer(s.score, 0) ||
    !integer(s.roundScore, 0, s.score) ||
    !integer(s.lives, 1, 5) ||
    !integer(s.combo, 0, s.hits) ||
    !integer(s.hits, 0) ||
    !integer(s.misses, 0) ||
    !Number.isFinite(s.remaining) ||
    s.remaining < 0 ||
    s.remaining > LEVELS[s.level - 1].time ||
    !Number.isFinite(s.spawnIn) ||
    s.spawnIn < 0 ||
    s.spawnIn > 1 ||
    !Array.isArray(s.holes) ||
    s.holes.length !== 9
  )
    return false;
  const config = LEVELS[s.level - 1];
  if (s.phase === 'playing' && s.remaining === 0) return false;
  if (
    s.phase === 'clear' &&
    (s.level === LEVELS.length ||
      s.remaining !== 0 ||
      s.roundScore < config.goal)
  )
    return false;
  if (
    s.phase === 'ready' &&
    (s.level !== 1 ||
      s.score !== 0 ||
      s.remaining !== config.time ||
      s.lives !== 5 ||
      s.hits !== 0 ||
      s.misses !== 0)
  )
    return false;
  if (s.phase !== 'playing' && s.holes.some(Boolean)) return false;
  return (
    s.holes.filter(Boolean).length <= config.capacity &&
    s.holes.every(
      (h) =>
        h === null ||
        (typeof h === 'object' &&
          ['mole', 'gold', 'bomb'].includes(h.kind) &&
          h.lifetime === config.lifetime &&
          Number.isFinite(h.remaining) &&
          h.remaining > 0 &&
          h.remaining <= h.lifetime),
    )
  );
}
