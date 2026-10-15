export const WIDTH = 400;
export const HEIGHT = 480;
export const CEILING = 60;
export const FLOOR_WIDTH = 96;
export const PLAYER_HEIGHT = 32;
export const PLAYER_RADIUS = 10;
export const FLOOR_GAP = 64;
export type FloorKind =
  | 'normal'
  | 'nails'
  | 'left'
  | 'right'
  | 'spring'
  | 'flip';

export interface ShaftFloor {
  id: number;
  x: number;
  y: number;
  kind: FloorKind;
  touched: boolean;
  animation: number;
}

export interface ShaftState {
  version: 1;
  phase: 'ready' | 'playing' | 'over';
  x: number;
  y: number;
  velocity: number;
  facing: -1 | 0 | 1;
  health: number;
  score: number;
  elapsed: number;
  scroll: number;
  invincible: number;
  grounded: number | null;
  seed: number;
  nextId: number;
  floors: ShaftFloor[];
}

function random(state: ShaftState) {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
}

function nextFloor(state: ShaftState, y: number): ShaftFloor {
  const value = random(state);
  const kind: FloorKind =
    value < 0.3
      ? 'normal'
      : value < 0.48
        ? 'nails'
        : value < 0.6
          ? 'left'
          : value < 0.72
            ? 'right'
            : value < 0.86
              ? 'spring'
              : 'flip';
  return {
    id: state.nextId++,
    x: 20 + random(state) * (WIDTH - FLOOR_WIDTH - 40),
    y,
    kind,
    touched: false,
    animation: -1,
  };
}

export function newShaft(
  seed = Math.floor(Math.random() * 4294967296),
): ShaftState {
  const floors: ShaftFloor[] = [
    { id: 0, x: 152, y: 210, kind: 'normal', touched: true, animation: -1 },
    { id: 1, x: 55, y: 286, kind: 'normal', touched: false, animation: -1 },
    { id: 2, x: 225, y: 362, kind: 'normal', touched: false, animation: -1 },
    { id: 3, x: 105, y: 438, kind: 'normal', touched: false, animation: -1 },
  ];
  return {
    version: 1,
    phase: 'ready',
    x: 200,
    y: 210,
    velocity: 0,
    facing: 0,
    health: 10,
    score: 0,
    elapsed: 0,
    scroll: 0,
    invincible: 0,
    grounded: 0,
    seed: seed >>> 0,
    nextId: 4,
    floors,
  };
}

export function stepShaft(
  state: ShaftState,
  seconds: number,
  direction: number,
  start = false,
) {
  const sounds: ('land' | 'hit' | 'spring' | 'flip')[] = [];
  if (
    state.phase === 'over' ||
    (state.phase === 'ready' && !start && !direction)
  )
    return { state, sounds };
  const next: ShaftState = {
    ...state,
    phase: 'playing',
    floors: state.floors.map((floor) => ({ ...floor })),
  };
  const movement = Math.sign(direction);
  next.facing = movement < 0 ? -1 : movement > 0 ? 1 : 0;
  let remaining = Math.min(Math.max(0, seconds), 0.1);
  while (remaining > 0 && next.phase === 'playing') {
    const dt = Math.min(1 / 120, remaining);
    remaining -= dt;
    next.elapsed += dt;
    next.invincible = Math.max(0, next.invincible - dt);
    const scroll = (72 + Math.min(72, next.score * 0.9)) * dt;
    next.scroll += scroll;
    next.score = Math.floor(next.scroll / FLOOR_GAP);
    for (const floor of next.floors) {
      floor.y -= scroll;
      if (floor.animation >= 0) floor.animation += dt;
    }
    const standing = next.floors.find((floor) => floor.id === next.grounded);
    const conveyor =
      standing?.kind === 'left' ? -92 : standing?.kind === 'right' ? 92 : 0;
    next.x = Math.max(
      18 + PLAYER_RADIUS,
      Math.min(
        WIDTH - 18 - PLAYER_RADIUS,
        next.x + (movement * 220 + conveyor) * dt,
      ),
    );
    if (
      standing &&
      next.x + PLAYER_RADIUS > standing.x &&
      next.x - PLAYER_RADIUS < standing.x + FLOOR_WIDTH &&
      !(standing.kind === 'flip' && standing.animation >= 0.12)
    ) {
      next.y = standing.y;
      next.velocity = 0;
    } else {
      next.grounded = null;
      const previousY = next.y;
      next.y += next.velocity * dt + 400 * dt * dt;
      next.velocity = Math.min(520, next.velocity + 800 * dt);
      if (next.velocity >= 0) {
        const landed = next.floors
          .filter(
            (floor) =>
              !(floor.kind === 'flip' && floor.animation >= 0.12) &&
              previousY <= floor.y + scroll + 0.5 &&
              next.y >= floor.y &&
              next.x + PLAYER_RADIUS > floor.x &&
              next.x - PLAYER_RADIUS < floor.x + FLOOR_WIDTH,
          )
          .sort((a, b) => a.y - b.y)[0];
        if (landed) {
          next.y = landed.y;
          next.velocity = 0;
          next.grounded = landed.id;
          if (landed.kind === 'spring') {
            next.velocity = -340;
            next.grounded = null;
            landed.animation = 0;
            sounds.push('spring');
          } else if (landed.kind === 'flip' && landed.animation < 0) {
            landed.animation = 0;
            sounds.push('flip');
          }
          if (!landed.touched) {
            landed.touched = true;
            if (landed.kind === 'normal') {
              next.health = Math.min(10, next.health + 1);
              sounds.push('land');
            } else if (landed.kind === 'nails') {
              next.health = Math.max(0, next.health - 3);
              next.invincible = 0.65;
              sounds.push('hit');
            }
          }
        }
      }
    }
    if (next.y - PLAYER_HEIGHT < CEILING) {
      next.y = CEILING + PLAYER_HEIGHT;
      next.velocity = 70;
      next.grounded = null;
      if (next.invincible <= 0) {
        next.health = Math.max(0, next.health - 3);
        next.invincible = 2;
        sounds.push('hit');
      }
    }
    next.floors = next.floors.filter((floor) => floor.y > CEILING - 40);
    while (
      !next.floors.length ||
      next.floors[next.floors.length - 1].y < HEIGHT + FLOOR_GAP
    ) {
      const y = next.floors.length
        ? next.floors[next.floors.length - 1].y + FLOOR_GAP
        : HEIGHT;
      next.floors.push(nextFloor(next, y));
    }
    if (next.health <= 0 || next.y - PLAYER_HEIGHT > HEIGHT)
      next.phase = 'over';
  }
  return { state: next, sounds };
}

const kinds: FloorKind[] = [
  'normal',
  'nails',
  'left',
  'right',
  'spring',
  'flip',
];
export function isShaftState(value: unknown): value is ShaftState {
  if (!value || typeof value !== 'object') return false;
  const state = value as ShaftState;
  if (state.version !== 1 || !['ready', 'playing'].includes(state.phase))
    return false;
  if (
    ![
      state.x,
      state.y,
      state.velocity,
      state.elapsed,
      state.scroll,
      state.invincible,
    ].every(Number.isFinite)
  )
    return false;
  if (
    !Number.isInteger(state.health) ||
    state.health < 1 ||
    state.health > 10 ||
    !Number.isInteger(state.score) ||
    state.score < 0
  )
    return false;
  if (
    ![-1, 0, 1].includes(state.facing) ||
    state.x < 0 ||
    state.x > WIDTH ||
    state.y < CEILING ||
    state.y > HEIGHT + PLAYER_HEIGHT
  )
    return false;
  if (
    !Number.isInteger(state.seed) ||
    state.seed < 0 ||
    state.seed > 4294967295 ||
    !Number.isInteger(state.nextId) ||
    state.nextId < 4
  )
    return false;
  if (
    state.elapsed < 0 ||
    state.scroll < 0 ||
    state.invincible < 0 ||
    state.invincible > 2
  )
    return false;
  if (
    !Array.isArray(state.floors) ||
    state.floors.length < 1 ||
    state.floors.length > 16
  )
    return false;
  const ids = new Set<number>();
  for (const floor of state.floors) {
    if (
      !floor ||
      !Number.isInteger(floor.id) ||
      floor.id < 0 ||
      floor.id >= state.nextId ||
      ids.has(floor.id)
    )
      return false;
    if (
      ![floor.x, floor.y, floor.animation].every(Number.isFinite) ||
      floor.x < 18 ||
      floor.x > WIDTH - FLOOR_WIDTH - 18 ||
      floor.y < CEILING - 40 ||
      floor.y > HEIGHT + FLOOR_GAP * 2
    )
      return false;
    if (
      !kinds.includes(floor.kind) ||
      typeof floor.touched !== 'boolean' ||
      floor.animation < -1
    )
      return false;
    ids.add(floor.id);
  }
  return state.grounded === null || ids.has(state.grounded);
}
