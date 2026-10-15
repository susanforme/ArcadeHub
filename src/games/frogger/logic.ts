export const WIDTH = 480;
export const HEIGHT = 640;
export const CELL = 40;
export const HOMES = [36, 138, 240, 342, 444];
export type Facing = 'UP' | 'RIGHT' | 'DOWN' | 'LEFT';
export type Death = 'car' | 'water' | 'edge' | 'home' | 'time';
export type FrogEvent = 'hop' | 'death' | 'home' | 'clear' | 'level';
export interface FrogState {
  version: 1;
  phase: 'ready' | 'playing' | 'dying' | 'clear' | 'over';
  level: number;
  score: number;
  lives: number;
  bonusLife: boolean;
  homes: boolean[];
  frog: { x: number; row: number; facing: Facing };
  furthest: number;
  remaining: number;
  clock: number;
  cooldown: number;
  delay: number;
  death: Death;
}
export interface Lane {
  row: number;
  kind: 'log' | 'turtle' | 'car';
  frame: string;
  width: number;
  speed: number;
  starts: number[];
}
export const LANES: Lane[] = [
  {
    row: 3,
    kind: 'log',
    frame: 'log-medium',
    width: 127,
    speed: 28,
    starts: [30, 235, 440],
  },
  {
    row: 4,
    kind: 'turtle',
    frame: 'turtle-two',
    width: 65,
    speed: -34,
    starts: [0, 136, 272, 408],
  },
  {
    row: 5,
    kind: 'log',
    frame: 'log-long',
    width: 196,
    speed: 42,
    starts: [30, 368],
  },
  {
    row: 6,
    kind: 'log',
    frame: 'log-short',
    width: 95,
    speed: 23,
    starts: [20, 212, 404],
  },
  {
    row: 7,
    kind: 'turtle',
    frame: 'turtle-three',
    width: 100,
    speed: -29,
    starts: [0, 194, 388],
  },
  {
    row: 9,
    kind: 'car',
    frame: 'truck',
    width: 61,
    speed: -32,
    starts: [60, 330],
  },
  {
    row: 10,
    kind: 'car',
    frame: 'car-fast',
    width: 40,
    speed: 76,
    starts: [10, 270],
  },
  {
    row: 11,
    kind: 'car',
    frame: 'car-purple',
    width: 40,
    speed: -43,
    starts: [80, 253, 426],
  },
  {
    row: 12,
    kind: 'car',
    frame: 'bulldozer',
    width: 40,
    speed: 30,
    starts: [20, 193, 366],
  },
  {
    row: 13,
    kind: 'car',
    frame: 'car-yellow',
    width: 40,
    speed: -38,
    starts: [90, 263, 436],
  },
];
export function newFrog(): FrogState {
  return {
    version: 1,
    phase: 'ready',
    level: 1,
    score: 0,
    lives: 3,
    bonusLife: false,
    homes: HOMES.map(() => false),
    frog: { x: 240, row: 14, facing: 'UP' },
    furthest: 14,
    remaining: 30,
    clock: 0,
    cooldown: 0,
    delay: 0,
    death: 'car',
  };
}
export const speedScale = (level: number) => 1 + Math.min(level - 1, 10) * 0.12;
export function obstacles(state: FrogState, lane: Lane) {
  const span = WIDTH + lane.width;
  return lane.starts.map((start, index) => {
    const travel = start + lane.speed * speedScale(state.level) * state.clock;
    const x = ((((travel + lane.width) % span) + span) % span) - lane.width;
    const cycle = (state.clock + index * 1.7 + lane.row * 0.4) % 9;
    // Only alternating groups dive; the other turtles always provide a crossing.
    const diving = lane.kind === 'turtle' && index % 2 === 0;
    return {
      x,
      submerged: diving && cycle >= 7.3 && cycle < 8.5,
      animation: diving && cycle >= 6 ? (cycle < 7 || cycle >= 8.5 ? 1 : 2) : 0,
    };
  });
}
function resetFrog(state: FrogState) {
  state.frog = { x: 240, row: 14, facing: 'UP' };
  state.furthest = 14;
  state.remaining = 30;
  state.cooldown = 0.18;
}
function die(state: FrogState, reason: Death): FrogEvent {
  state.phase = 'dying';
  state.death = reason;
  state.lives--;
  state.delay = 1.15;
  return 'death';
}
function award(state: FrogState, points: number) {
  state.score += points;
  if (!state.bonusLife && state.score >= 20000) {
    state.bonusLife = true;
    state.lives++;
  }
}
function collision(state: FrogState): FrogEvent | undefined {
  const { x, row } = state.frog;
  if (x < 12 || x > WIDTH - 12) return die(state, 'edge');
  if (row === 2) {
    const home = HOMES.findIndex((center) => Math.abs(center - x) <= 12);
    if (home < 0 || state.homes[home]) return die(state, 'home');
    state.homes[home] = true;
    award(state, 50 + Math.ceil(state.remaining) * 10);
    if (state.homes.every(Boolean)) {
      award(state, 1000);
      state.phase = 'clear';
      state.delay = 1.8;
      return 'clear';
    }
    resetFrog(state);
    return 'home';
  }
  const lane = LANES.find((item) => item.row === row);
  if (!lane) return;
  const pieces = obstacles(state, lane);
  if (lane.kind === 'car') {
    if (
      pieces.some(
        (piece) => x + 12 > piece.x + 4 && x - 12 < piece.x + lane.width - 4,
      )
    )
      return die(state, 'car');
  } else if (
    !pieces.some(
      (piece) =>
        !piece.submerged &&
        x - 8 >= piece.x + 2 &&
        x + 8 <= piece.x + lane.width - 2,
    )
  ) {
    return die(state, 'water');
  }
}
export function hop(state: FrogState, facing: Facing): FrogEvent | undefined {
  if (state.phase === 'ready') state.phase = 'playing';
  if (state.phase !== 'playing' || state.cooldown > 0) return;
  const nextX =
    state.frog.x + (facing === 'LEFT' ? -CELL : facing === 'RIGHT' ? CELL : 0);
  const nextRow =
    state.frog.row + (facing === 'UP' ? -1 : facing === 'DOWN' ? 1 : 0);
  if (nextX < 20 || nextX > WIDTH - 20 || nextRow > 14) return;
  state.frog = { x: nextX, row: nextRow, facing };
  state.cooldown = 0.18;
  if (nextRow < state.furthest) {
    award(state, 10);
    state.furthest = nextRow;
  }
  return collision(state) ?? 'hop';
}
export function stepFrog(
  state: FrogState,
  seconds: number,
): FrogEvent | undefined {
  if (state.phase === 'ready' || state.phase === 'over') return;
  const dt = Math.max(0, Math.min(seconds, 0.1));
  if (state.phase === 'dying' || state.phase === 'clear') {
    state.delay = Math.max(0, state.delay - dt);
    if (state.delay > 0) return;
    if (state.lives === 0) {
      state.phase = 'over';
      return;
    }
    if (state.phase === 'clear') {
      state.level++;
      state.homes.fill(false);
      state.clock = 0;
    }
    resetFrog(state);
    state.phase = 'playing';
    return 'level';
  }
  // Small simulation steps prevent fast vehicles passing through the frog after a slow frame.
  const count = Math.max(1, Math.ceil(dt / (1 / 120)));
  for (let i = 0; i < count; i++) {
    const slice = dt / count;
    state.clock += slice;
    state.cooldown = Math.max(0, state.cooldown - slice);
    state.remaining = Math.max(0, state.remaining - slice);
    if (state.remaining === 0) return die(state, 'time');
    const lane = LANES.find((item) => item.row === state.frog.row);
    if (lane && lane.kind !== 'car')
      state.frog.x += lane.speed * speedScale(state.level) * slice;
    const event = collision(state);
    if (event) return event;
  }
}
export function isFrogState(value: unknown): value is FrogState {
  if (!value || typeof value !== 'object') return false;
  const s = value as FrogState;
  const finite = (n: unknown, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  return (
    s.version === 1 &&
    ['ready', 'playing', 'dying', 'clear'].includes(s.phase) &&
    Number.isInteger(s.level) &&
    finite(s.level, 1, 1000000) &&
    Number.isInteger(s.score) &&
    finite(s.score, 0, Number.MAX_SAFE_INTEGER) &&
    Number.isInteger(s.lives) &&
    finite(s.lives, 0, 4) &&
    (s.lives > 0 || s.phase === 'dying') &&
    typeof s.bonusLife === 'boolean' &&
    Array.isArray(s.homes) &&
    s.homes.length === 5 &&
    s.homes.every((home) => typeof home === 'boolean') &&
    !!s.frog &&
    finite(s.frog.x, 0, WIDTH) &&
    Number.isInteger(s.frog.row) &&
    finite(s.frog.row, 2, 14) &&
    ['UP', 'RIGHT', 'DOWN', 'LEFT'].includes(s.frog.facing) &&
    Number.isInteger(s.furthest) &&
    finite(s.furthest, 2, 14) &&
    finite(s.remaining, 0, 30) &&
    finite(s.clock, 0, Number.MAX_SAFE_INTEGER) &&
    finite(s.cooldown, 0, 0.18) &&
    finite(s.delay, 0, 1.8) &&
    ['car', 'water', 'edge', 'home', 'time'].includes(s.death) &&
    (s.phase !== 'clear' || s.homes.every(Boolean))
  );
}
