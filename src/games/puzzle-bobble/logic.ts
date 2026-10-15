import { LEVELS } from './levels';

export const COLS = 8;
export const ROWS = 12;
export const RADIUS = 24;
export const ROW_HEIGHT = 42;
export const LEFT = 48;
export const RIGHT = 432;
export const TOP = 120;
export const LIMIT = 594;
export const LAUNCHER = { x: 240, y: 642 };
export const MAX_ANGLE = 1.22;
export const PRESSURE_SHOTS = 8;
const SPEED = 760;
export interface Shot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
}
export interface BubbleState {
  version: 1;
  level: number;
  board: number[];
  score: number;
  current: number;
  next: number;
  angle: number;
  shots: number;
  ceiling: number;
  phase: 'playing' | 'clear' | 'over' | 'won';
  shot: Shot | null;
}
export interface Burst {
  index: number;
  color: number;
  falling: boolean;
}
const validCell = (row: number, col: number) =>
  row >= 0 && row < ROWS && col >= 0 && col < COLS - (row % 2);
export function position(index: number, ceiling = 0) {
  const row = Math.floor(index / COLS);
  return {
    x: LEFT + RADIUS + (index % COLS) * RADIUS * 2 + (row % 2) * RADIUS,
    y: TOP + RADIUS + (row + ceiling) * ROW_HEIGHT,
  };
}
export function neighbors(index: number) {
  const row = Math.floor(index / COLS),
    col = index % COLS;
  return [
    [row, col - 1],
    [row, col + 1],
    [row - 1, col - (1 - (row % 2))],
    [row - 1, col + (row % 2)],
    [row + 1, col - (1 - (row % 2))],
    [row + 1, col + (row % 2)],
  ]
    .filter(([r, c]) => validCell(r, c))
    .map(([r, c]) => r * COLS + c);
}
export function connected(board: number[], seeds: number[], color?: number) {
  const seen = new Set<number>();
  const queue = [...seeds];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (
      seen.has(cell) ||
      !board[cell] ||
      (color !== undefined && board[cell] !== color)
    )
      continue;
    seen.add(cell);
    queue.push(...neighbors(cell).filter((n) => !seen.has(n)));
  }
  return seen;
}
export function chooseColor(board: number[], random = Math.random) {
  const colors = [...new Set(board.filter(Boolean))];
  return (
    colors[Math.min(colors.length - 1, Math.floor(random() * colors.length))] ??
    1
  );
}
export function newBubbleState(
  level = 1,
  score = 0,
  random = Math.random,
): BubbleState {
  const board = Array<number>(COLS * ROWS).fill(0);
  LEVELS[level - 1].forEach((row, r) => {
    [...row].forEach((value, c) => {
      board[r * COLS + c] = value === '.' ? 0 : Number(value);
    });
  });
  return {
    version: 1,
    level,
    board,
    score,
    current: chooseColor(board, random),
    next: chooseColor(board, random),
    angle: 0,
    shots: 0,
    ceiling: 0,
    phase: 'playing',
    shot: null,
  };
}
export function fire(state: BubbleState) {
  if (state.phase !== 'playing' || state.shot) return false;
  state.shot = {
    ...LAUNCHER,
    vx: Math.sin(state.angle) * SPEED,
    vy: -Math.cos(state.angle) * SPEED,
    color: state.current,
  };
  return true;
}
export function swap(state: BubbleState) {
  if (state.phase === 'playing' && !state.shot)
    [state.current, state.next] = [state.next, state.current];
}
// Small distance steps keep collision and bank shots identical at any render frame rate.
export function advanceShot(
  shot: Shot,
  board: number[],
  ceiling: number,
  seconds: number,
): number | null {
  const steps = Math.max(1, Math.ceil((seconds * SPEED) / 4));
  for (let i = 0; i < steps; i++) {
    shot.x += (shot.vx * seconds) / steps;
    shot.y += (shot.vy * seconds) / steps;
    if (shot.x < LEFT + RADIUS) {
      shot.x = 2 * (LEFT + RADIUS) - shot.x;
      shot.vx = Math.abs(shot.vx);
    }
    if (shot.x > RIGHT - RADIUS) {
      shot.x = 2 * (RIGHT - RADIUS) - shot.x;
      shot.vx = -Math.abs(shot.vx);
    }
    let candidates: number[] | undefined;
    if (shot.y <= TOP + RADIUS + ceiling * ROW_HEIGHT)
      candidates = Array.from({ length: COLS }, (_, col) => col);
    else {
      const hit = board.findIndex((color, index) => {
        if (!color) return false;
        const p = position(index, ceiling);
        return Math.hypot(p.x - shot.x, p.y - shot.y) <= RADIUS * 2 - 0.3;
      });
      if (hit >= 0) candidates = neighbors(hit);
    }
    if (candidates) {
      const free = candidates.filter((index) => !board[index]);
      free.sort((a, b) => {
        const pa = position(a, ceiling),
          pb = position(b, ceiling);
        return (
          Math.hypot(pa.x - shot.x, pa.y - shot.y) -
          Math.hypot(pb.x - shot.x, pb.y - shot.y)
        );
      });
      return free[0] ?? -1;
    }
  }
  return null;
}
export function settle(
  state: BubbleState,
  index: number,
  random = Math.random,
): Burst[] {
  if (!state.shot) return [];
  const color = state.shot.color;
  state.shot = null;
  if (index < 0 || index >= state.board.length || state.board[index]) {
    state.phase = 'over';
    return [];
  }
  state.board[index] = color;
  state.shots++;
  const bursts: Burst[] = [];
  const matching = connected(state.board, [index], color);
  if (matching.size >= 3) {
    for (const cell of matching) {
      bursts.push({ index: cell, color, falling: false });
      state.board[cell] = 0;
    }
    const anchored = connected(
      state.board,
      Array.from({ length: COLS }, (_, c) => c),
    );
    state.board.forEach((value, cell) => {
      if (value && !anchored.has(cell)) {
        bursts.push({ index: cell, color: value, falling: true });
        state.board[cell] = 0;
      }
    });
    const dropped = bursts.length - matching.size;
    state.score +=
      matching.size * 10 +
      (dropped ? Math.min(10000, 10 * 2 ** Math.min(10, dropped)) : 0);
  }
  if (state.shots % PRESSURE_SHOTS === 0) state.ceiling++;
  if (!state.board.some(Boolean)) {
    state.score += 1000;
    state.phase = state.level === LEVELS.length ? 'won' : 'clear';
  } else {
    if (
      state.board.some(
        (value, cell) =>
          value && position(cell, state.ceiling).y + RADIUS >= LIMIT,
      )
    )
      state.phase = 'over';
    state.current = state.board.includes(state.next)
      ? state.next
      : chooseColor(state.board, random);
    state.next = chooseColor(state.board, random);
  }
  return bursts;
}
export function stepBubble(
  state: BubbleState,
  seconds: number,
  random = Math.random,
) {
  if (state.phase !== 'playing' || !state.shot) return [];
  const index = advanceShot(
    state.shot,
    state.board,
    state.ceiling,
    Math.min(0.1, Math.max(0, seconds)),
  );
  return index === null ? [] : settle(state, index, random);
}
export function aimPath(state: BubbleState) {
  const shot: Shot = {
    ...LAUNCHER,
    vx: Math.sin(state.angle) * SPEED,
    vy: -Math.cos(state.angle) * SPEED,
    color: state.current,
  };
  const points = [{ ...LAUNCHER }];
  for (let i = 0; i < 100; i++) {
    const hit = advanceShot(shot, state.board, state.ceiling, 0.018);
    points.push({ x: shot.x, y: shot.y });
    if (hit !== null) break;
  }
  return points;
}
export function isBubbleState(value: unknown): value is BubbleState {
  if (!value || typeof value !== 'object') return false;
  const s = value as BubbleState;
  const integer = (n: number, min: number, max: number) =>
    Number.isInteger(n) && n >= min && n <= max;
  if (
    s.version !== 1 ||
    !integer(s.level, 1, LEVELS.length) ||
    !integer(s.score, 0, Number.MAX_SAFE_INTEGER) ||
    !integer(s.shots, 0, 10000) ||
    !integer(s.ceiling, 0, ROWS) ||
    s.ceiling !== Math.floor(s.shots / PRESSURE_SHOTS) ||
    !Number.isFinite(s.angle) ||
    Math.abs(s.angle) > MAX_ANGLE ||
    !integer(s.current, 1, 8) ||
    !integer(s.next, 1, 8) ||
    !['playing', 'clear'].includes(s.phase) ||
    !Array.isArray(s.board) ||
    s.board.length !== COLS * ROWS
  )
    return false;
  if (
    !s.board.every(
      (color, i) =>
        integer(color, 0, 8) &&
        (validCell(Math.floor(i / COLS), i % COLS) || color === 0),
    )
  )
    return false;
  if (s.phase === 'clear')
    return (
      s.board.every((color) => !color) &&
      s.shot === null &&
      s.level < LEVELS.length
    );
  if (
    !s.board.some(Boolean) ||
    connected(
      s.board,
      Array.from({ length: COLS }, (_, i) => i),
    ).size !== s.board.filter(Boolean).length ||
    s.board.some(
      (color, i) => color && position(i, s.ceiling).y + RADIUS >= LIMIT,
    ) ||
    !s.board.includes(s.current) ||
    !s.board.includes(s.next)
  )
    return false;
  if (s.shot === null) return true;
  const p = s.shot;
  return (
    !!p &&
    [p.x, p.y, p.vx, p.vy].every(Number.isFinite) &&
    p.x >= LEFT + RADIUS &&
    p.x <= RIGHT - RADIUS &&
    p.y >= TOP + RADIUS + s.ceiling * ROW_HEIGHT &&
    p.y <= LAUNCHER.y &&
    p.vy < 0 &&
    Math.abs(Math.hypot(p.vx, p.vy) - SPEED) < 0.01 &&
    p.color === s.current
  );
}
