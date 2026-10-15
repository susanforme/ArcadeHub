export const WIDTH = 400;
export const HEIGHT = 600;
export const PLATFORM_WIDTH = 72;
export const PLAYER_RADIUS = 17;
export const PLAYER_HEIGHT = 52;
export const START_Y = 552;
export const GRAVITY = 1400;
export const JUMP_SPEED = 650;
export const MOVE_SPEED = 260;

export interface Platform {
  id: number;
  x: number;
  y: number;
}
export interface DoodleState {
  version: 1;
  phase: 'ready' | 'jumping' | 'over';
  x: number;
  y: number;
  velocity: number;
  facing: -1 | 1;
  cameraTop: number;
  highest: number;
  score: number;
  nextId: number;
  platforms: Platform[];
}

export function landingTime(rise: number) {
  return (
    (JUMP_SPEED + Math.sqrt(JUMP_SPEED ** 2 - 2 * GRAVITY * rise)) / GRAVITY
  );
}

export function nextPlatform(
  previous: Platform,
  id: number,
  random = Math.random,
): Platform {
  const difficulty = Math.min(1, Math.max(0, START_Y - previous.y) / 6000);
  const rise = 60 + random() * (20 + difficulty * 32);
  // Keep ample steering time even when landing near the edge of the last platform.
  const reach = MOVE_SPEED * landingTime(rise) * 0.6;
  const margin = PLATFORM_WIDTH / 2 + 4;
  const left = Math.max(margin, previous.x - reach);
  const right = Math.min(WIDTH - margin, previous.x + reach);
  return { id, x: left + random() * (right - left), y: previous.y - rise };
}

function fillPlatforms(state: DoodleState, random: () => number) {
  while (
    state.platforms[state.platforms.length - 1].y >
    state.cameraTop - 140
  ) {
    state.platforms.push(
      nextPlatform(
        state.platforms[state.platforms.length - 1],
        state.nextId++,
        random,
      ),
    );
  }
}

export function newDoodle(random = Math.random): DoodleState {
  const state: DoodleState = {
    version: 1,
    phase: 'ready',
    x: WIDTH / 2,
    y: START_Y,
    velocity: 0,
    facing: 1,
    cameraTop: 0,
    highest: START_Y,
    score: 0,
    nextId: 1,
    platforms: [{ id: 0, x: WIDTH / 2, y: START_Y }],
  };
  fillPlatforms(state, random);
  return state;
}

export function stepDoodle(
  state: DoodleState,
  seconds: number,
  direction: number,
  start = false,
  random = Math.random,
): { state: DoodleState; bounced: boolean } {
  if (state.phase === 'over' || (state.phase === 'ready' && !start))
    return { state, bounced: false };
  const next: DoodleState = {
    ...state,
    phase: 'jumping',
    velocity: state.phase === 'ready' ? -JUMP_SPEED : state.velocity,
    platforms: [...state.platforms],
  };
  const movement = Math.sign(direction);
  if (movement) next.facing = movement < 0 ? -1 : 1;
  let remaining = Math.max(0, Math.min(seconds, 0.1));
  let bounced = false;
  while (remaining > 0) {
    const dt = Math.min(remaining, 1 / 120);
    remaining -= dt;
    const previousY = next.y;
    const previousX = next.x;
    const travel = movement * MOVE_SPEED * dt;
    next.x = (((previousX + travel) % WIDTH) + WIDTH) % WIDTH;
    next.y += next.velocity * dt + (GRAVITY * dt * dt) / 2;
    next.velocity += GRAVITY * dt;
    if (next.velocity > 0 && next.y > previousY) {
      for (const platform of next.platforms) {
        if (previousY > platform.y || next.y < platform.y) continue;
        const fraction = (platform.y - previousY) / (next.y - previousY);
        const landingX =
          (((previousX + travel * fraction) % WIDTH) + WIDTH) % WIDTH;
        const distance = Math.abs(landingX - platform.x);
        if (
          Math.min(distance, WIDTH - distance) >=
          PLATFORM_WIDTH / 2 + PLAYER_RADIUS
        )
          continue;
        next.y = platform.y;
        next.velocity = -JUMP_SPEED;
        bounced = true;
        break;
      }
    }
    next.highest = Math.min(next.highest, next.y);
    next.score = Math.floor(START_Y - next.highest);
    next.cameraTop = Math.min(next.cameraTop, next.y - HEIGHT * 0.4);
    if (next.y - PLAYER_HEIGHT > next.cameraTop + HEIGHT) {
      next.phase = 'over';
      break;
    }
    next.platforms = next.platforms.filter(
      (platform) => platform.y < next.cameraTop + HEIGHT + 28,
    );
    fillPlatforms(next, random);
  }
  return { state: next, bounced };
}

export function isDoodleState(value: unknown): value is DoodleState {
  if (!value || typeof value !== 'object') return false;
  const state = value as DoodleState;
  return (
    state.version === 1 &&
    (state.phase === 'ready' || state.phase === 'jumping') &&
    Number.isFinite(state.x) &&
    state.x >= 0 &&
    state.x < WIDTH &&
    Number.isFinite(state.y) &&
    Number.isFinite(state.velocity) &&
    Math.abs(state.velocity) <= 2000 &&
    (state.facing === -1 || state.facing === 1) &&
    Number.isFinite(state.cameraTop) &&
    state.cameraTop <= 0 &&
    state.y >= state.cameraTop &&
    state.y - PLAYER_HEIGHT <= state.cameraTop + HEIGHT &&
    Number.isFinite(state.highest) &&
    state.highest <= START_Y &&
    state.highest <= state.y &&
    Number.isSafeInteger(state.score) &&
    state.score === Math.floor(START_Y - state.highest) &&
    Number.isSafeInteger(state.nextId) &&
    state.nextId > 0 &&
    Array.isArray(state.platforms) &&
    state.platforms.length >= 2 &&
    state.platforms.length <= 24 &&
    state.platforms.every(
      (platform, index) =>
        platform &&
        Number.isSafeInteger(platform.id) &&
        platform.id >= 0 &&
        platform.id < state.nextId &&
        Number.isFinite(platform.x) &&
        platform.x >= PLATFORM_WIDTH / 2 &&
        platform.x <= WIDTH - PLATFORM_WIDTH / 2 &&
        Number.isFinite(platform.y) &&
        platform.y <= state.cameraTop + HEIGHT + 28 &&
        platform.y >= state.cameraTop - 260 &&
        (index === 0 ||
          (platform.y < state.platforms[index - 1].y &&
            platform.id > state.platforms[index - 1].id)),
    )
  );
}
