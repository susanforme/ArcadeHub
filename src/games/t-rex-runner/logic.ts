export const WIDTH = 600;
export const HEIGHT = 200;
export const GROUND = 170;
export const DINO_X = 50;
export const DINO_HEIGHT = 47;
export const START_SPEED = 360;
export const MAX_SPEED = 780;
export const GRAVITY = 2160;
export type ObstacleKind = 'small' | 'large' | 'bird';
export interface Obstacle {
  id: number;
  kind: ObstacleKind;
  x: number;
  y: number;
  size: number;
}
export interface RunnerState {
  version: 1;
  phase: 'ready' | 'running' | 'over';
  lift: number;
  velocity: number;
  ducking: boolean;
  distance: number;
  speed: number;
  score: number;
  nightRemaining: number;
  spawnIn: number;
  nextId: number;
  obstacles: Obstacle[];
}
export interface RunnerInput {
  jump: boolean;
  held: boolean;
  duck: boolean;
}
interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const runningBoxes: Box[] = [
  { x: 22, y: 0, width: 17, height: 16 },
  { x: 1, y: 18, width: 30, height: 9 },
  { x: 10, y: 35, width: 14, height: 8 },
  { x: 1, y: 24, width: 29, height: 5 },
  { x: 5, y: 30, width: 21, height: 4 },
  { x: 9, y: 34, width: 15, height: 4 },
];
const cactusBoxes: Record<'small' | 'large', Box[]> = {
  small: [
    { x: 0, y: 7, width: 5, height: 27 },
    { x: 4, y: 0, width: 6, height: 34 },
    { x: 10, y: 4, width: 7, height: 14 },
  ],
  large: [
    { x: 0, y: 12, width: 7, height: 38 },
    { x: 8, y: 0, width: 7, height: 49 },
    { x: 13, y: 10, width: 10, height: 38 },
  ],
};
const birdBoxes: Box[] = [
  { x: 15, y: 15, width: 16, height: 5 },
  { x: 18, y: 21, width: 24, height: 6 },
  { x: 2, y: 14, width: 4, height: 3 },
  { x: 6, y: 10, width: 4, height: 7 },
  { x: 10, y: 8, width: 6, height: 9 },
];
export const obstacleWidth = (obstacle: Obstacle) =>
  (obstacle.kind === 'bird' ? 46 : obstacle.kind === 'small' ? 17 : 25) *
  obstacle.size;
export function newRunner(): RunnerState {
  return {
    version: 1,
    phase: 'ready',
    lift: 0,
    velocity: 0,
    ducking: false,
    distance: 0,
    speed: START_SPEED,
    score: 0,
    nightRemaining: 0,
    spawnIn: 1.5,
    nextId: 0,
    obstacles: [],
  };
}
export function createObstacle(
  id: number,
  speed: number,
  random = Math.random,
): Obstacle {
  const choice = random();
  const kind: ObstacleKind =
    speed >= 510 && choice > 0.7 ? 'bird' : choice < 0.5 ? 'small' : 'large';
  const maxSize = kind === 'bird' || (kind === 'large' && speed < 420) ? 1 : 3;
  const size = 1 + Math.min(maxSize - 1, Math.floor(random() * maxSize));
  const y =
    kind === 'bird'
      ? [GROUND - 40, GROUND - 65, GROUND - 90][
          Math.min(2, Math.floor(random() * 3))
        ]
      : GROUND - (kind === 'small' ? 35 : 50);
  return { id, kind, x: WIDTH + 10, y, size };
}
export function collides(state: RunnerState, obstacle: Obstacle) {
  const dino = state.ducking
    ? [{ x: 1, y: 18, width: 55, height: 25 }]
    : runningBoxes;
  const boxes =
    obstacle.kind === 'bird'
      ? birdBoxes
      : Array.from({ length: obstacle.size }, (_, index) =>
          cactusBoxes[obstacle.kind as 'small' | 'large'].map((box) => ({
            ...box,
            x: box.x + index * (obstacle.kind === 'small' ? 17 : 25),
          })),
        ).flat();
  const dinoY = GROUND - DINO_HEIGHT - state.lift;
  return dino.some((a) =>
    boxes.some(
      (b) =>
        DINO_X + a.x < obstacle.x + b.x + b.width &&
        DINO_X + a.x + a.width > obstacle.x + b.x &&
        dinoY + a.y < obstacle.y + b.y + b.height &&
        dinoY + a.y + a.height > obstacle.y + b.y,
    ),
  );
}
export function stepRunner(
  state: RunnerState,
  seconds: number,
  input: RunnerInput,
  random = Math.random,
): RunnerState {
  if (state.phase === 'over' || (state.phase === 'ready' && !input.jump))
    return state;
  const next: RunnerState = {
    ...state,
    phase: 'running',
    obstacles: state.obstacles.map((obstacle) => ({ ...obstacle })),
  };
  next.ducking = input.duck && next.lift === 0;
  if (input.jump && next.lift === 0 && !next.ducking)
    next.velocity = -(600 + next.speed / 10);
  let remaining = Math.max(0, Math.min(seconds, 0.1));
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    remaining -= dt;
    if (next.lift > 0 || next.velocity < 0) {
      if (input.duck) next.velocity = Math.max(400, next.velocity);
      else if (!input.held && next.lift >= 30 && next.velocity < -300)
        next.velocity = -300;
      next.lift -= next.velocity * dt;
      next.velocity += GRAVITY * dt;
      if (next.lift <= 0) {
        next.lift = 0;
        next.velocity = 0;
      }
    }
    next.ducking = input.duck && next.lift === 0;
    next.distance += next.speed * dt;
    next.speed = Math.min(MAX_SPEED, next.speed + 3.6 * dt);
    next.nightRemaining = Math.max(0, next.nightRemaining - dt);
    const score = Math.round(next.distance * 0.025);
    if (Math.floor(score / 700) > Math.floor(next.score / 700))
      next.nightRemaining = 12;
    next.score = score;
    for (const obstacle of next.obstacles)
      obstacle.x -= (next.speed + (obstacle.kind === 'bird' ? 48 : 0)) * dt;
    if (next.obstacles.some((obstacle) => collides(next, obstacle))) {
      next.phase = 'over';
      break;
    }
    next.obstacles = next.obstacles.filter(
      (obstacle) => obstacle.x + obstacleWidth(obstacle) > 0,
    );
    next.spawnIn -= dt;
    if (next.spawnIn <= 0) {
      const obstacle = createObstacle(next.nextId++, next.speed, random);
      next.obstacles.push(obstacle);
      const gap =
        (obstacleWidth(obstacle) * (next.speed / 60) +
          (obstacle.kind === 'bird' ? 150 : 120) * 0.6) *
        (1 + random() * 0.5);
      next.spawnIn += (obstacleWidth(obstacle) + gap) / next.speed;
    }
  }
  return next;
}
export function isRunnerState(value: unknown): value is RunnerState {
  if (!value || typeof value !== 'object') return false;
  const state = value as RunnerState;
  return (
    state.version === 1 &&
    (state.phase === 'ready' || state.phase === 'running') &&
    Number.isFinite(state.lift) &&
    state.lift >= 0 &&
    state.lift <= 120 &&
    Number.isFinite(state.velocity) &&
    Math.abs(state.velocity) <= 1200 &&
    typeof state.ducking === 'boolean' &&
    Number.isFinite(state.distance) &&
    state.distance >= 0 &&
    Number.isInteger(state.score) &&
    state.score === Math.round(state.distance * 0.025) &&
    Number.isFinite(state.speed) &&
    state.speed >= START_SPEED &&
    state.speed <= MAX_SPEED &&
    Number.isFinite(state.spawnIn) &&
    state.spawnIn >= 0 &&
    state.spawnIn <= 10 &&
    Number.isFinite(state.nightRemaining) &&
    state.nightRemaining >= 0 &&
    state.nightRemaining <= 12 &&
    Number.isInteger(state.nextId) &&
    state.nextId >= 0 &&
    Array.isArray(state.obstacles) &&
    state.obstacles.length <= 10 &&
    state.obstacles.every(
      (obstacle) =>
        obstacle &&
        Number.isInteger(obstacle.id) &&
        obstacle.id >= 0 &&
        obstacle.id < state.nextId &&
        ['small', 'large', 'bird'].includes(obstacle.kind) &&
        Number.isFinite(obstacle.x) &&
        obstacle.x > -obstacleWidth(obstacle) &&
        obstacle.x <= WIDTH + 10 &&
        Number.isInteger(obstacle.size) &&
        obstacle.size >= 1 &&
        obstacle.size <= (obstacle.kind === 'bird' ? 1 : 3) &&
        (obstacle.kind === 'bird'
          ? [GROUND - 40, GROUND - 65, GROUND - 90].includes(obstacle.y)
          : obstacle.y === GROUND - (obstacle.kind === 'small' ? 35 : 50)),
    ) &&
    new Set(state.obstacles.map((obstacle) => obstacle.id)).size ===
      state.obstacles.length
  );
}
