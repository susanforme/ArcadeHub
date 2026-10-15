import {
  BALL_SIZE,
  LEVEL_COUNT,
  lengthOf,
  mapFor,
  type Point,
  pointAt,
} from './levels';

export type Marble = { id: number; color: number; distance: number };
export type Shot = Point & { color: number; vx: number; vy: number };
export interface ZumaState {
  version: 1;
  level: number;
  lives: number;
  score: number;
  phase: 'ready' | 'playing' | 'clear' | 'lost' | 'won' | 'over';
  balls: Marble[];
  remaining: number;
  current: number;
  next: number;
  serial: number;
  combo: number;
  angle: number;
  cooldown: number;
  shot: Shot | null;
}
export type ZumaEvent =
  | { type: 'pop'; balls: Marble[]; points: number; combo: number }
  | { type: 'insert' | 'clear' | 'lost' };

export const colorsFor = (level: number) => 4 + Math.floor((level - 1) / 3);
const randomColor = (level: number, random: () => number) =>
  Math.floor(random() * colorsFor(level));

export function newZuma(
  level = 1,
  score = 0,
  lives = 3,
  random = Math.random,
): ZumaState {
  const balls: Marble[] = [];
  let color = randomColor(level, random);
  for (let i = 0; i < 24; i++) {
    if (i % 2 === 0)
      color =
        (color + 1 + Math.floor(random() * (colorsFor(level) - 1))) %
        colorsFor(level);
    balls.push({ id: i, color, distance: (24 - i) * BALL_SIZE });
  }
  return {
    version: 1,
    level,
    lives,
    score,
    phase: 'ready',
    balls,
    remaining: 24 + level * 4,
    current: balls[0].color,
    next: balls[2].color,
    serial: 24,
    combo: 0,
    angle: -Math.PI / 2,
    cooldown: 0,
    shot: null,
  };
}

export function chooseColor(state: ZumaState, random = Math.random) {
  const colors = [...new Set(state.balls.map((ball) => ball.color))];
  return colors.length
    ? colors[Math.floor(random() * colors.length)]
    : randomColor(state.level, random);
}

export function swapBalls(state: ZumaState) {
  if (state.phase === 'playing')
    [state.current, state.next] = [state.next, state.current];
}

export function fire(state: ZumaState, random = Math.random) {
  if (state.phase !== 'playing' || state.shot || state.cooldown > 0)
    return false;
  const frog = mapFor(state.level).frog;
  const dx = Math.cos(state.angle);
  const dy = Math.sin(state.angle);
  state.shot = {
    x: frog.x + dx * 38,
    y: frog.y + dy * 38,
    vx: dx * 760,
    vy: dy * 760,
    color: state.current,
  };
  state.current = state.next;
  state.next = chooseColor(state, random);
  state.cooldown = 0.18;
  return true;
}

export function matchAt(state: ZumaState, index: number, events: ZumaEvent[]) {
  const target = state.balls[index];
  if (!target) return false;
  let first = index;
  let last = index;
  while (
    first > 0 &&
    state.balls[first - 1].color === target.color &&
    state.balls[first - 1].distance - state.balls[first].distance <=
      BALL_SIZE + 0.5
  )
    first--;
  while (
    last < state.balls.length - 1 &&
    state.balls[last + 1].color === target.color &&
    state.balls[last].distance - state.balls[last + 1].distance <=
      BALL_SIZE + 0.5
  )
    last++;
  if (last - first < 2) return false;
  state.combo++;
  const balls = state.balls.splice(first, last - first + 1);
  const points = balls.length * 10 * state.combo;
  state.score += points;
  events.push({ type: 'pop', balls, points, combo: state.combo });
  return true;
}

export function insertBall(
  state: ZumaState,
  index: number,
  before: boolean,
  color: number,
  events: ZumaEvent[],
) {
  const slot = index + (before ? 0 : 1);
  const distance = state.balls[index].distance + (before ? BALL_SIZE : 0);
  for (let i = 0; i < slot; i++) state.balls[i].distance += BALL_SIZE;
  state.balls.splice(slot, 0, { id: state.serial++, color, distance });
  // The projectile pushes the connected part toward the skull, never into its neighbour.
  for (let i = slot - 1; i >= 0; i--)
    state.balls[i].distance = Math.max(
      state.balls[i].distance,
      state.balls[i + 1].distance + BALL_SIZE,
    );
  events.push({ type: 'insert' });
  state.combo = 0;
  matchAt(state, slot, events);
}

function moveChain(state: ZumaState, dt: number, events: ZumaEvent[]) {
  const speed = (14 + state.level * 2.3) * dt;
  for (const ball of state.balls) ball.distance += speed;
  for (let i = state.balls.length - 2; i >= 0; i--) {
    const front = state.balls[i];
    const rear = state.balls[i + 1];
    const gap = front.distance - rear.distance - BALL_SIZE;
    if (gap <= 0.01) continue;
    let start = i;
    while (
      start > 0 &&
      state.balls[start - 1].distance - state.balls[start].distance <=
        BALL_SIZE + 0.5
    )
      start--;
    const same = front.color === rear.color;
    const pull = Math.min(gap, same ? 190 * dt : speed);
    for (let j = start; j <= i; j++) state.balls[j].distance -= pull;
    if (same && gap - pull < 0.01 && matchAt(state, i, events)) break;
  }
}

export function stepZuma(
  state: ZumaState,
  seconds: number,
  random = Math.random,
): ZumaEvent[] {
  const events: ZumaEvent[] = [];
  if (state.phase !== 'playing') return events;
  // Substeps keep fast shots from tunnelling through a moving marble.
  let remainingTime = Math.max(0, Math.min(seconds, 0.1));
  while (remainingTime > 0) {
    const dt = Math.min(remainingTime, 1 / 120);
    remainingTime -= dt;
    state.cooldown = Math.max(0, state.cooldown - dt);
    moveChain(state, dt, events);
    const tail = state.balls[state.balls.length - 1];
    if (state.remaining > 0 && (!tail || tail.distance >= BALL_SIZE)) {
      const color =
        tail && random() < 0.5 ? tail.color : randomColor(state.level, random);
      state.balls.push({
        id: state.serial++,
        color,
        distance: tail ? tail.distance - BALL_SIZE : 0,
      });
      state.remaining--;
    }
    const shot = state.shot;
    if (shot) {
      shot.x += shot.vx * dt;
      shot.y += shot.vy * dt;
      let hit = -1;
      let nearest = BALL_SIZE * BALL_SIZE;
      for (let i = 0; i < state.balls.length; i++) {
        if (state.balls[i].distance < 0) continue;
        const p = pointAt(state.level, state.balls[i].distance);
        const distance = (p.x - shot.x) ** 2 + (p.y - shot.y) ** 2;
        if (distance < nearest) {
          hit = i;
          nearest = distance;
        }
      }
      if (hit >= 0) {
        const ball = state.balls[hit];
        const p = pointAt(state.level, ball.distance);
        const ahead = pointAt(state.level, ball.distance + 2);
        const before =
          (shot.x - p.x) * (ahead.x - p.x) + (shot.y - p.y) * (ahead.y - p.y) >
          0;
        insertBall(state, hit, before, shot.color, events);
        state.shot = null;
      } else if (shot.x < -32 || shot.x > 880 || shot.y < 48 || shot.y > 560) {
        state.shot = null;
        state.combo = 0;
      }
    }
    if (state.balls[0]?.distance >= lengthOf(state.level)) {
      state.lives--;
      state.phase = state.lives ? 'lost' : 'over';
      state.shot = null;
      events.push({ type: 'lost' });
      break;
    }
    if (!state.balls.length && !state.remaining) {
      state.score += 500 + state.level * 100;
      state.phase = state.level === LEVEL_COUNT ? 'won' : 'clear';
      state.shot = null;
      events.push({ type: 'clear' });
      break;
    }
    if (!state.remaining && state.balls.length) {
      const colors = new Set(state.balls.map((ball) => ball.color));
      if (!colors.has(state.current))
        state.current = chooseColor(state, random);
      if (!colors.has(state.next)) state.next = chooseColor(state, random);
    }
  }
  return events;
}

export function isZumaState(value: unknown): value is ZumaState {
  if (!value || typeof value !== 'object') return false;
  const s = value as ZumaState;
  const integer = (n: number, min: number, max: number) =>
    Number.isInteger(n) && n >= min && n <= max;
  if (
    s.version !== 1 ||
    !integer(s.level, 1, LEVEL_COUNT) ||
    !integer(s.lives, 1, 3) ||
    !integer(s.score, 0, Number.MAX_SAFE_INTEGER) ||
    !['ready', 'playing', 'clear', 'lost'].includes(s.phase) ||
    !integer(s.remaining, 0, 24 + s.level * 4) ||
    !integer(s.serial, 24, Number.MAX_SAFE_INTEGER) ||
    !integer(s.combo, 0, 10000) ||
    !Number.isFinite(s.angle) ||
    !Number.isFinite(s.cooldown) ||
    s.cooldown < 0 ||
    s.cooldown > 0.18
  )
    return false;
  const validColor = (n: number) => integer(n, 0, colorsFor(s.level) - 1);
  if (
    !validColor(s.current) ||
    !validColor(s.next) ||
    !Array.isArray(s.balls) ||
    s.balls.length > 300
  )
    return false;
  const ids = new Set<number>();
  for (const [i, ball] of s.balls.entries()) {
    if (
      !ball ||
      !integer(ball.id, 0, s.serial - 1) ||
      ids.has(ball.id) ||
      !validColor(ball.color) ||
      !Number.isFinite(ball.distance) ||
      ball.distance < -BALL_SIZE ||
      ball.distance >=
        lengthOf(s.level) + (s.phase === 'lost' ? BALL_SIZE * 2 : 0) ||
      (i > 0 && s.balls[i - 1].distance - ball.distance < BALL_SIZE - 0.1)
    )
      return false;
    ids.add(ball.id);
  }
  if (
    s.phase === 'clear' &&
    (s.balls.length || s.remaining || s.level === LEVEL_COUNT)
  )
    return false;
  if (s.phase === 'playing' && !s.balls.length && !s.remaining) return false;
  const p = s.shot;
  return (
    p === null ||
    (s.phase === 'playing' &&
      typeof p === 'object' &&
      validColor(p.color) &&
      [p.x, p.y, p.vx, p.vy].every(Number.isFinite) &&
      p.x >= -32 &&
      p.x <= 880 &&
      p.y >= 48 &&
      p.y <= 560 &&
      Math.abs(Math.hypot(p.vx, p.vy) - 760) < 0.01)
  );
}
