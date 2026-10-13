// SPDX-License-Identifier: GPL-3.0-only
import type { Action } from '../../core/types';
import { COLS, MAZE, ROWS, TOTAL_DOTS, TUNNEL_Y } from './map';

export type Direction = Extract<Action, 'UP' | 'LEFT' | 'DOWN' | 'RIGHT'>;
export const DIRECTIONS: Direction[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
export const VECTOR: Record<Direction, { x: number; y: number }> = {
  UP: { x: 0, y: -1 },
  LEFT: { x: -1, y: 0 },
  DOWN: { x: 0, y: 1 },
  RIGHT: { x: 1, y: 0 },
};
const OPPOSITE: Record<Direction, Direction> = {
  UP: 'DOWN',
  DOWN: 'UP',
  LEFT: 'RIGHT',
  RIGHT: 'LEFT',
};
export interface Actor {
  x: number;
  y: number;
  dir: Direction;
  progress: number;
}
export interface Ghost extends Actor {
  mode: 'house' | 'leaving' | 'active' | 'eyes';
  releaseAt: number;
  scared: boolean;
}
export interface PacmanState {
  version: 1;
  score: number;
  level: number;
  lives: number;
  extraLife: boolean;
  pellets: boolean[];
  player: Actor;
  wanted: Direction;
  ghosts: Ghost[];
  power: number;
  combo: number;
  modeTime: number;
  scatter: boolean;
  roundTime: number;
  phase: 'ready' | 'playing' | 'dying' | 'clear' | 'over';
  wait: number;
  fruitTime: number;
  fruitSpawned: number;
  notice: string;
  noticeTime: number;
}
export type GameEvent =
  | 'pellet'
  | 'power'
  | 'ghost'
  | 'death'
  | 'level'
  | 'fruit'
  | 'extra';
const corners = [
  { x: 25, y: -3 },
  { x: 2, y: -3 },
  { x: 27, y: 32 },
  { x: 0, y: 32 },
];
const powerSeconds = [6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1];
export const FRUIT_VALUES = [
  100, 300, 500, 500, 700, 700, 1000, 1000, 2000, 2000, 3000, 3000, 5000,
];
const actor = (x: number, y: number, dir: Direction): Actor => ({
  x,
  y,
  dir,
  progress: 0,
});
const pellets = () =>
  MAZE.flatMap((row) => [...row].map((c) => c === '.' || c === 'o'));

function resetActors(state: PacmanState) {
  state.player = actor(13, 23, 'LEFT');
  state.wanted = 'LEFT';
  state.ghosts = [13, 13, 11, 15].map((x, i) => ({
    ...actor(x, i === 0 ? 11 : 14, 'LEFT'),
    mode: i === 0 ? 'active' : 'house',
    releaseAt: [0, 0, 8, 13][i],
    scared: false,
  }));
  state.power = 0;
  state.combo = 0;
  state.modeTime = 0;
  state.scatter = true;
  state.roundTime = 0;
  state.fruitTime = 0;
}
export function newPacman(): PacmanState {
  const state: PacmanState = {
    version: 1,
    score: 0,
    level: 1,
    lives: 3,
    extraLife: false,
    pellets: pellets(),
    player: actor(13, 23, 'LEFT'),
    wanted: 'LEFT',
    ghosts: [],
    power: 0,
    combo: 0,
    modeTime: 0,
    scatter: true,
    roundTime: 0,
    phase: 'ready',
    wait: 4.2,
    fruitTime: 0,
    fruitSpawned: 0,
    notice: '',
    noticeTime: 0,
  };
  resetActors(state);
  return state;
}
export function neighbor(x: number, y: number, dir: Direction) {
  const v = VECTOR[dir];
  let nx = x + v.x;
  const ny = y + v.y;
  if (ny === TUNNEL_Y) nx = (nx + COLS) % COLS;
  return { x: nx, y: ny };
}
export function walkable(x: number, y: number, home = false) {
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
  const c = MAZE[y][x];
  return (
    c === '.' ||
    c === 'o' ||
    c === ' ' ||
    (home && (c === '-' || (x >= 11 && x <= 16 && y >= 13 && y <= 15)))
  );
}
export function actorPosition(a: Actor) {
  const v = VECTOR[a.dir];
  return {
    x: (a.x + v.x * a.progress + COLS) % COLS,
    y: a.y + v.y * a.progress,
  };
}
function reverse(a: Actor) {
  if (a.progress > 0) {
    Object.assign(a, neighbor(a.x, a.y, a.dir));
    a.progress = 1 - a.progress;
  }
  a.dir = OPPOSITE[a.dir];
}
function canMove(a: Actor, dir: Direction, home = false) {
  const p = neighbor(a.x, a.y, dir);
  return walkable(p.x, p.y, home);
}
function advance(
  a: Actor,
  distance: number,
  choose: () => Direction,
  home: boolean,
  arrived?: () => boolean,
) {
  while (distance > 0) {
    if (a.progress === 0) {
      a.dir = choose();
      if (!canMove(a, a.dir, home)) return;
    }
    const step = Math.min(distance, 1 - a.progress);
    a.progress += step;
    distance -= step;
    if (a.progress >= 1 - 1e-9) {
      Object.assign(a, neighbor(a.x, a.y, a.dir));
      a.progress = 0;
      if (arrived?.() === false) return;
    }
  }
}
export function ghostTarget(state: PacmanState, index: number) {
  const p = state.player,
    v = VECTOR[p.dir];
  if (state.scatter) return corners[index];
  if (index === 0) return { x: p.x, y: p.y };
  if (index === 1) return { x: p.x + v.x * 4, y: p.y + v.y * 4 };
  if (index === 2)
    return {
      x: 2 * (p.x + v.x * 2) - state.ghosts[0].x,
      y: 2 * (p.y + v.y * 2) - state.ghosts[0].y,
    };
  const g = state.ghosts[index];
  return (g.x - p.x) ** 2 + (g.y - p.y) ** 2 >= 64
    ? { x: p.x, y: p.y }
    : corners[index];
}
// Eyes and exiting ghosts need a route through the house door, rather than chase targeting.
function homeDirection(g: Ghost, target: { x: number; y: number }) {
  const visited = new Set<number>([g.y * COLS + g.x]);
  const queue = [{ x: g.x, y: g.y, first: g.dir }];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell.x === target.x && cell.y === target.y) return cell.first;
    for (const dir of DIRECTIONS) {
      const next = neighbor(cell.x, cell.y, dir),
        key = next.y * COLS + next.x;
      if (!walkable(next.x, next.y, true) || visited.has(key)) continue;
      visited.add(key);
      queue.push({ ...next, first: i === 0 ? dir : cell.first });
    }
  }
  return g.dir;
}
export function chooseGhostDirection(
  state: PacmanState,
  index: number,
  random = Math.random,
) {
  const g = state.ghosts[index];
  if (g.mode === 'eyes') return homeDirection(g, { x: 13, y: 14 });
  if (g.mode === 'leaving') return homeDirection(g, { x: 13, y: 11 });
  const available = DIRECTIONS.filter((dir) => canMove(g, dir));
  let choices = available.filter((dir) => dir !== OPPOSITE[g.dir]);
  if (!g.scared && (g.x === 12 || g.x === 15) && (g.y === 11 || g.y === 23))
    choices = choices.filter((dir) => dir !== 'UP');
  if (!choices.length) choices = available;
  if (!choices.length) return g.dir;
  if (g.scared)
    return choices[
      Math.min(choices.length - 1, Math.floor(random() * choices.length))
    ];
  const target = ghostTarget(state, index);
  return choices.reduce((best, dir) => {
    const next = neighbor(g.x, g.y, dir),
      previous = neighbor(g.x, g.y, best);
    return (next.x - target.x) ** 2 + (next.y - target.y) ** 2 <
      (previous.x - target.x) ** 2 + (previous.y - target.y) ** 2
      ? dir
      : best;
  });
}
function scatterAt(time: number, level: number) {
  const spans =
    level === 1
      ? [7, 20, 7, 20, 5, 20, 5]
      : level < 5
        ? [7, 20, 7, 20, 5, 1033, 1 / 60]
        : [5, 20, 5, 20, 5, 1037, 1 / 60];
  for (let i = 0; i < spans.length; i++) {
    if (time < spans[i]) return i % 2 === 0;
    time -= spans[i];
  }
  return false;
}
function award(state: PacmanState, value: number, events: GameEvent[]) {
  state.score += value;
  if (!state.extraLife && state.score >= 10000) {
    state.extraLife = true;
    state.lives++;
    events.push('extra');
  }
}
function eat(state: PacmanState, events: GameEvent[]) {
  const p = state.player,
    index = p.y * COLS + p.x;
  if (!state.pellets[index]) return;
  state.pellets[index] = false;
  const power = MAZE[p.y][p.x] === 'o';
  award(state, power ? 50 : 10, events);
  events.push(power ? 'power' : 'pellet');
  if (power) {
    state.power = powerSeconds[state.level - 1] ?? 0;
    state.combo = 0;
    for (const ghost of state.ghosts) {
      if (ghost.mode === 'eyes') continue;
      ghost.scared = state.power > 0;
      if (ghost.mode === 'active') reverse(ghost);
    }
  }
  const eaten = TOTAL_DOTS - state.pellets.filter(Boolean).length;
  if (
    (state.fruitSpawned === 0 && eaten >= 70) ||
    (state.fruitSpawned === 1 && eaten >= 170)
  ) {
    state.fruitSpawned++;
    state.fruitTime = 9;
  }
  if (!state.pellets.some(Boolean)) {
    state.phase = 'clear';
    state.wait = 1.8;
    events.push('level');
  }
}
function collisions(state: PacmanState, events: GameEvent[]) {
  const p = actorPosition(state.player);
  for (const ghost of state.ghosts) {
    if (ghost.mode !== 'active') continue;
    const g = actorPosition(ghost);
    let dx = Math.abs(p.x - g.x);
    if (Math.abs(p.y - TUNNEL_Y) < 0.5 && Math.abs(g.y - TUNNEL_Y) < 0.5)
      dx = Math.min(dx, COLS - dx);
    if (Math.hypot(dx, p.y - g.y) >= 0.65) continue;
    if (ghost.scared && state.power > 0) {
      ghost.mode = 'eyes';
      ghost.scared = false;
      const points = 200 * 2 ** Math.min(3, state.combo++);
      award(state, points, events);
      state.notice = `+${points}`;
      state.noticeTime = 1;
      events.push('ghost');
    } else {
      state.lives--;
      state.phase = 'dying';
      state.wait = 1.4;
      events.push('death');
      return;
    }
  }
}
// Called at a fixed 120 Hz by the Phaser scene, including collision checks before and after motion.
export function stepPacman(
  state: PacmanState,
  delta: number,
  random = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.phase === 'over') return events;
  state.noticeTime = Math.max(0, state.noticeTime - delta);
  if (state.phase !== 'playing') {
    state.wait = Math.max(0, state.wait - delta);
    if (state.wait > 0) return events;
    if (state.phase === 'dying') {
      if (state.lives === 0) {
        state.phase = 'over';
        return events;
      }
      resetActors(state);
      state.phase = 'ready';
      state.wait = 2;
      return events;
    }
    if (state.phase === 'clear') {
      state.level++;
      state.pellets = pellets();
      state.fruitSpawned = 0;
      resetActors(state);
      state.phase = 'ready';
      state.wait = 2;
      return events;
    }
    state.phase = 'playing';
  }
  state.roundTime += delta;
  state.fruitTime = Math.max(0, state.fruitTime - delta);
  if (state.power > 0) {
    state.power = Math.max(0, state.power - delta);
    if (state.power === 0)
      for (const ghost of state.ghosts) ghost.scared = false;
  } else {
    state.modeTime += delta;
    const scatter = scatterAt(state.modeTime, state.level);
    if (state.scatter !== scatter) {
      state.scatter = scatter;
      for (const ghost of state.ghosts)
        if (ghost.mode === 'active') reverse(ghost);
    }
  }
  if (state.player.progress === 0) eat(state, events);
  if (state.phase !== 'playing') return events;
  collisions(state, events);
  if (state.phase !== 'playing') return events;
  if (state.wanted === OPPOSITE[state.player.dir] && state.player.progress > 0)
    reverse(state.player);
  const boost = Math.min(2.5, (state.level - 1) * 0.25);
  advance(
    state.player,
    (6.5 + boost) * delta,
    () =>
      canMove(state.player, state.wanted) ? state.wanted : state.player.dir,
    false,
    () => {
      eat(state, events);
      return state.phase === 'playing';
    },
  );
  if (state.phase !== 'playing') return events;
  const p = actorPosition(state.player);
  if (state.fruitTime > 0 && Math.hypot(p.x - 13.5, p.y - 17) < 0.8) {
    const points =
      FRUIT_VALUES[Math.min(state.level - 1, FRUIT_VALUES.length - 1)];
    award(state, points, events);
    state.fruitTime = 0;
    state.notice = `+${points}`;
    state.noticeTime = 1;
    events.push('fruit');
  }
  for (let i = 0; i < state.ghosts.length; i++) {
    const ghost = state.ghosts[i];
    if (ghost.mode === 'house') {
      if (state.roundTime < ghost.releaseAt) continue;
      ghost.mode = 'leaving';
    }
    const speed =
      ghost.mode === 'eyes'
        ? 13
        : ghost.scared
          ? 3.6
          : ghost.y === TUNNEL_Y && (ghost.x < 6 || ghost.x > 21)
            ? 3.4
            : 5.8 + boost;
    advance(
      ghost,
      speed * delta,
      () => chooseGhostDirection(state, i, random),
      ghost.mode !== 'active',
      () => {
        if (ghost.mode === 'eyes' && ghost.x === 13 && ghost.y === 14) {
          ghost.mode = 'house';
          ghost.releaseAt = state.roundTime + 1;
        } else if (ghost.mode === 'leaving' && ghost.x === 13 && ghost.y === 11)
          ghost.mode = 'active';
        return ghost.mode !== 'house';
      },
    );
  }
  collisions(state, events);
  return events;
}

export function isPacmanState(value: unknown): value is PacmanState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PacmanState;
  const integer = (n: number, min: number, max: number) =>
    Number.isSafeInteger(n) && n >= min && n <= max;
  const finite = (n: number, max = Number.MAX_SAFE_INTEGER) =>
    Number.isFinite(n) && n >= 0 && n <= max;
  const validActor = (a: Actor, home: boolean) =>
    !!a &&
    integer(a.x, 0, COLS - 1) &&
    integer(a.y, 0, ROWS - 1) &&
    DIRECTIONS.includes(a.dir) &&
    finite(a.progress, 1) &&
    a.progress < 1 &&
    walkable(a.x, a.y, home) &&
    (a.progress === 0 || canMove(a, a.dir, home));
  return (
    s.version === 1 &&
    integer(s.score, 0, Number.MAX_SAFE_INTEGER) &&
    integer(s.level, 1, 100000) &&
    integer(s.lives, s.phase === 'dying' ? 0 : 1, 4) &&
    s.extraLife === s.score >= 10000 &&
    Array.isArray(s.pellets) &&
    s.pellets.length === COLS * ROWS &&
    Array.from(s.pellets).every(
      (p, i) =>
        typeof p === 'boolean' &&
        (!p || '.o'.includes(MAZE[Math.floor(i / COLS)][i % COLS])),
    ) &&
    validActor(s.player, false) &&
    DIRECTIONS.includes(s.wanted) &&
    Array.isArray(s.ghosts) &&
    s.ghosts.length === 4 &&
    Array.from(s.ghosts).every(
      (g) =>
        !!g &&
        ['house', 'leaving', 'active', 'eyes'].includes(g.mode) &&
        validActor(g, g.mode !== 'active') &&
        finite(g.releaseAt) &&
        typeof g.scared === 'boolean',
    ) &&
    finite(s.power, 6) &&
    integer(s.combo, 0, 4) &&
    finite(s.modeTime) &&
    typeof s.scatter === 'boolean' &&
    finite(s.roundTime) &&
    ['ready', 'playing', 'dying', 'clear'].includes(s.phase) &&
    finite(s.wait, 4.2) &&
    finite(s.fruitTime, 9) &&
    integer(s.fruitSpawned, 0, 2) &&
    typeof s.notice === 'string' &&
    s.notice.length <= 30 &&
    finite(s.noticeTime, 1) &&
    (s.phase === 'clear' ? !s.pellets.some(Boolean) : s.pellets.some(Boolean))
  );
}
