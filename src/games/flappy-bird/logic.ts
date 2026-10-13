export const WIDTH = 288;
export const HEIGHT = 512;
export const GROUND = 400;
export const BIRD_X = 72;
export const BIRD_RX = 10;
export const BIRD_RY = 8;
export const PIPE_WIDTH = 52;
export const GAP = 128;
export const SPACING = 170;
export const SPEED = 100;
export const GRAVITY = 900;
export const FLAP_VELOCITY = -280;

export interface Pipe {
  id: number;
  x: number;
  gapY: number;
  passed: boolean;
}
export interface FlappyState {
  version: 1;
  phase: 'ready' | 'flying' | 'over';
  y: number;
  velocity: number;
  pipes: Pipe[];
  nextId: number;
  score: number;
  distance: number;
}
const gapY = (random: () => number) => 100 + random() * 200;
export function newFlappy(random = Math.random): FlappyState {
  return {
    version: 1,
    phase: 'ready',
    y: 220,
    velocity: 0,
    pipes: [{ id: 0, x: WIDTH + 50, gapY: gapY(random), passed: false }],
    nextId: 1,
    score: 0,
    distance: 0,
  };
}
export function stepFlappy(
  state: FlappyState,
  seconds: number,
  flap: boolean,
  random = Math.random,
): FlappyState {
  if (state.phase === 'over' || (state.phase === 'ready' && !flap))
    return state;
  const next: FlappyState = {
    ...state,
    phase: 'flying',
    velocity: flap ? FLAP_VELOCITY : state.velocity,
    pipes: state.pipes.map((pipe) => ({ ...pipe })),
  };
  let remaining = Math.max(0, Math.min(seconds, 0.1));
  // Small physics steps prevent tunnelling through pipes on a slow frame.
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    remaining -= dt;
    next.velocity += GRAVITY * dt;
    next.y += next.velocity * dt;
    if (next.y < BIRD_RY) {
      next.y = BIRD_RY;
      next.velocity = 0;
    }
    next.distance += SPEED * dt;
    for (const pipe of next.pipes) pipe.x -= SPEED * dt;
    const hitPipe = next.pipes.some(
      (pipe) =>
        pipe.x < BIRD_X + BIRD_RX &&
        pipe.x + PIPE_WIDTH > BIRD_X - BIRD_RX &&
        (next.y - BIRD_RY < pipe.gapY - GAP / 2 ||
          next.y + BIRD_RY > pipe.gapY + GAP / 2),
    );
    if (hitPipe || next.y + BIRD_RY >= GROUND) {
      next.phase = 'over';
      break;
    }
    for (const pipe of next.pipes) {
      if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RX) {
        pipe.passed = true;
        next.score++;
      }
    }
    next.pipes = next.pipes.filter((pipe) => pipe.x + PIPE_WIDTH > 0);
    const last = next.pipes[next.pipes.length - 1];
    if (!last || last.x <= WIDTH) {
      next.pipes.push({
        id: next.nextId++,
        x: last ? last.x + SPACING : WIDTH + 50,
        gapY: gapY(random),
        passed: false,
      });
    }
  }
  return next;
}
export function isFlappyState(value: unknown): value is FlappyState {
  if (!value || typeof value !== 'object') return false;
  const state = value as FlappyState;
  return (
    state.version === 1 &&
    (state.phase === 'ready' || state.phase === 'flying') &&
    Number.isFinite(state.y) &&
    state.y >= BIRD_RY &&
    state.y + BIRD_RY < GROUND &&
    Number.isFinite(state.velocity) &&
    Math.abs(state.velocity) <= 1000 &&
    Number.isInteger(state.score) &&
    state.score >= 0 &&
    Number.isFinite(state.distance) &&
    state.distance >= 0 &&
    Number.isInteger(state.nextId) &&
    state.nextId >= 1 &&
    Array.isArray(state.pipes) &&
    state.pipes.length >= 1 &&
    state.pipes.length <= 4 &&
    state.pipes.every(
      (pipe) =>
        pipe &&
        Number.isInteger(pipe.id) &&
        pipe.id >= 0 &&
        pipe.id < state.nextId &&
        Number.isFinite(pipe.x) &&
        pipe.x > -PIPE_WIDTH &&
        pipe.x <= WIDTH + SPACING &&
        Number.isFinite(pipe.gapY) &&
        pipe.gapY >= 100 &&
        pipe.gapY <= 300 &&
        typeof pipe.passed === 'boolean',
    ) &&
    new Set(state.pipes.map((pipe) => pipe.id)).size === state.pipes.length
  );
}
