import levels from './levels.json';

export const WIDTH = 640;
export const HEIGHT = 480;
export const GROUND = 200;
export const LEVELS = levels;
export const BALL_RADII = [19, 12, 6, 3] as const;
export const BALL_FRAMES = [
  [48, 40],
  [32, 26],
  [16, 14],
  [8, 7],
] as const;
export const BLOCK_SIZES: Record<number, readonly [number, number]> = {
  20: [32, 8],
  21: [32, 8],
  22: [8, 32],
  23: [8, 32],
  24: [16, 8],
  25: [16, 8],
  26: [8, 8],
  27: [8, 8],
};
const BREAKABLE = new Set([21, 22, 25, 27]);
const GRAVITY = 1250;
const BOUNCE = [625, 500, 400, 325];
const BONUS_TYPES = [2, 3, 5, 6, 7, 8];
export type Weapon = 'normal' | 'double' | 'glue';
export interface PangBall {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  bounce: number;
  bonus: number;
  childBonus: number;
}
export interface PangShot {
  id: number;
  x: number;
  top: number;
  bottom: number;
  weapon: Weapon;
  stuck: number;
}
export interface PangBonus {
  id: number;
  x: number;
  y: number;
  kind: number;
  life: number;
}
export interface PangPop {
  id: number;
  x: number;
  y: number;
  size: number;
  age: number;
}
export interface PangState {
  version: 1;
  phase: 'ready' | 'playing' | 'dead' | 'cleared' | 'over' | 'won';
  level: number;
  x: number;
  y: number;
  velocity: number;
  facing: -1 | 1;
  moving: boolean;
  climbing: number | null;
  lives: number;
  score: number;
  nextLife: number;
  time: number;
  elapsed: number;
  phaseTime: number;
  weapon: Weapon;
  fireCooldown: number;
  freeze: number;
  shield: boolean;
  invincible: number;
  seed: number;
  nextId: number;
  balls: PangBall[];
  shots: PangShot[];
  bonuses: PangBonus[];
  broken: number[];
  pops: PangPop[];
}
export interface PangInput {
  horizontal: number;
  vertical: number;
  fire: boolean;
  start?: boolean;
}
export type PangSound = 'shoot' | 'pop' | 'hit' | 'collect' | 'clear';

function setupLevel(state: PangState, level: number): PangState {
  const data = LEVELS[level - 1];
  const next: PangState = {
    ...state,
    phase: 'ready',
    level,
    x: data.playerX + 15,
    y: GROUND,
    velocity: 0,
    climbing: null,
    moving: false,
    time: 100,
    phaseTime: 0,
    fireCooldown: 0,
    freeze: 0,
    shield: false,
    invincible: 0,
    balls: [],
    shots: [],
    bonuses: [],
    broken: [],
    pops: [],
  };
  next.balls = data.balls.map((ball) => ({
    id: next.nextId++,
    x: ball.x + BALL_FRAMES[ball.size][0] / 2,
    y: ball.y + BALL_FRAMES[ball.size][1] / 2,
    vx: ball.direction * 100,
    vy: -ball.vel * 50,
    size: ball.size,
    bounce: ball.vel_cst * 50,
    bonus: ball.bonus,
    childBonus: ball.bonus_parent,
  }));
  return next;
}

export function newPang(
  seed = Math.floor(Math.random() * 4294967296),
  level = 1,
): PangState {
  const initial: PangState = {
    version: 1,
    phase: 'ready',
    level: 1,
    x: 165,
    y: GROUND,
    velocity: 0,
    facing: 1,
    moving: false,
    climbing: null,
    lives: 3,
    score: 0,
    nextLife: 25000,
    time: 100,
    elapsed: 0,
    phaseTime: 0,
    weapon: 'normal',
    fireCooldown: 0,
    freeze: 0,
    shield: false,
    invincible: 0,
    seed: seed >>> 0,
    nextId: 1,
    balls: [],
    shots: [],
    bonuses: [],
    broken: [],
    pops: [],
  };
  return setupLevel(
    initial,
    Math.max(1, Math.min(LEVELS.length, Math.floor(level))),
  );
}

export function activePlatforms(state: PangState) {
  return LEVELS[state.level - 1].platforms.flatMap((block, id) =>
    state.broken.includes(id)
      ? []
      : [
          {
            ...block,
            id,
            width: BLOCK_SIZES[block.type][0],
            height: BLOCK_SIZES[block.type][1],
          },
        ],
  );
}

function award(state: PangState, points: number) {
  state.score += points;
  while (state.score >= state.nextLife) {
    state.lives = Math.min(9, state.lives + 1);
    state.nextLife += 50000;
  }
}

function dropBonus(state: PangState, code: number, x: number, y: number) {
  if (!code) return;
  let kind = code;
  if (kind === 99) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    kind = [2, 3, 5, 6, 8][Math.floor((state.seed / 4294967296) * 5)];
  }
  state.bonuses.push({ id: state.nextId++, x, y, kind, life: 10 });
}

export function splitBall(state: PangState, ball: PangBall, withBonus = true) {
  state.balls = state.balls.filter((item) => item.id !== ball.id);
  state.pops.push({
    id: state.nextId++,
    x: ball.x,
    y: ball.y,
    size: ball.size,
    age: 0,
  });
  if (state.pops.length > 40) state.pops.shift();
  award(state, [100, 200, 300, 400][ball.size]);
  if (withBonus) dropBonus(state, ball.bonus, ball.x, ball.y);
  if (ball.size < 3) {
    const size = ball.size + 1;
    for (const direction of [-1, 1])
      state.balls.push({
        id: state.nextId++,
        x: Math.max(
          8 + BALL_RADII[size],
          Math.min(312 - BALL_RADII[size], ball.x + direction * 2),
        ),
        y: ball.y,
        size,
        vx: direction * 100,
        vy: -Math.min(180, BOUNCE[size]),
        bounce: BOUNCE[size],
        bonus: withBonus && direction < 0 ? ball.childBonus : 0,
        childBonus: 0,
      });
  }
}

function hitPlayer(state: PangState, sounds: PangSound[]) {
  if (state.invincible > 0) return;
  if (state.shield) {
    state.shield = false;
    state.invincible = 2;
    sounds.push('collect');
    return;
  }
  state.lives--;
  state.phase = state.lives > 0 ? 'dead' : 'over';
  state.phaseTime = 0;
  state.shots = [];
  sounds.push('hit');
}

function overlapsCircle(
  x: number,
  y: number,
  radius: number,
  left: number,
  top: number,
  width: number,
  height: number,
) {
  const nearX = Math.max(left, Math.min(left + width, x));
  const nearY = Math.max(top, Math.min(top + height, y));
  return (x - nearX) ** 2 + (y - nearY) ** 2 < radius ** 2;
}

function movePlayer(state: PangState, dt: number, input: PangInput) {
  const horizontal = Math.sign(input.horizontal);
  const vertical = Math.sign(input.vertical);
  const ladders = LEVELS[state.level - 1].ladders;
  const blocks = activePlatforms(state);
  state.moving = horizontal !== 0;
  if (horizontal) state.facing = horizontal < 0 ? -1 : 1;
  if (vertical) {
    const ladderIndex = ladders.findIndex(
      (ladder) =>
        Math.abs(state.x - ladder.x - 11) < 13 &&
        state.y >= ladder.y - 3 &&
        state.y <= ladder.y + ladder.rungs * 4 + 3,
    );
    if (ladderIndex >= 0) state.climbing = ladderIndex;
  }
  if (state.climbing !== null && !horizontal) {
    const ladder = ladders[state.climbing];
    state.x = ladder.x + 11;
    state.y = Math.max(
      ladder.y - 1,
      Math.min(
        Math.min(GROUND, ladder.y + ladder.rungs * 4),
        state.y + vertical * 75 * dt,
      ),
    );
    state.velocity = 0;
    state.moving = vertical !== 0;
    if (
      (vertical < 0 && state.y <= ladder.y - 1) ||
      (vertical > 0 && state.y >= Math.min(GROUND, ladder.y + ladder.rungs * 4))
    )
      state.climbing = null;
    return;
  }
  state.climbing = null;
  const previousX = state.x;
  state.x = Math.max(17, Math.min(303, state.x + horizontal * 105 * dt));
  for (const block of blocks) {
    if (state.y <= block.y + 0.1 || state.y - 28 >= block.y + block.height)
      continue;
    if (state.x + 9 > block.x && state.x - 9 < block.x + block.width) {
      if (previousX + 9 <= block.x + 0.5) state.x = block.x - 9;
      else if (previousX - 9 >= block.x + block.width - 0.5)
        state.x = block.x + block.width + 9;
    }
  }
  const previousY = state.y;
  state.velocity = Math.min(400, state.velocity + 1000 * dt);
  state.y += state.velocity * dt;
  const surfaces = [
    ...blocks.map((block) => ({ x: block.x, y: block.y, width: block.width })),
    ...ladders.map((ladder) => ({ x: ladder.x, y: ladder.y - 1, width: 22 })),
  ];
  for (const surface of surfaces) {
    if (
      previousY <= surface.y + 0.3 &&
      state.y >= surface.y &&
      state.x + 8 > surface.x &&
      state.x - 8 < surface.x + surface.width
    ) {
      state.y = surface.y;
      state.velocity = 0;
    }
  }
  if (state.y >= GROUND) {
    state.y = GROUND;
    state.velocity = 0;
  }
}

function moveBall(
  ball: PangBall,
  dt: number,
  blocks: ReturnType<typeof activePlatforms>,
) {
  const radius = BALL_RADII[ball.size];
  const previousX = ball.x;
  const previousY = ball.y;
  ball.x += ball.vx * dt;
  ball.vy += GRAVITY * dt;
  ball.y += ball.vy * dt;
  if (ball.x - radius <= 8) {
    ball.x = 8 + radius;
    ball.vx = Math.abs(ball.vx);
  }
  if (ball.x + radius >= 312) {
    ball.x = 312 - radius;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y + radius >= GROUND) {
    ball.y = GROUND - radius;
    ball.vy = -ball.bounce;
  }
  if (ball.y - radius <= 8) {
    ball.y = 8 + radius;
    ball.vy = Math.abs(ball.vy);
  }
  for (const block of blocks) {
    if (
      !overlapsCircle(
        ball.x,
        ball.y,
        radius,
        block.x,
        block.y,
        block.width,
        block.height,
      )
    )
      continue;
    if (previousY + radius <= block.y + 0.5 && ball.vy > 0) {
      ball.y = block.y - radius;
      ball.vy = -ball.bounce;
    } else if (
      previousY - radius >= block.y + block.height - 0.5 &&
      ball.vy < 0
    ) {
      ball.y = block.y + block.height + radius;
      ball.vy = Math.abs(ball.vy);
    } else if (previousX < block.x + block.width / 2) {
      ball.x = block.x - radius;
      ball.vx = -Math.abs(ball.vx);
    } else {
      ball.x = block.x + block.width + radius;
      ball.vx = Math.abs(ball.vx);
    }
  }
}

export function stepPang(state: PangState, seconds: number, input: PangInput) {
  const sounds: PangSound[] = [];
  if (state.phase === 'over' || state.phase === 'won') return { state, sounds };
  if (
    state.phase === 'ready' &&
    !input.start &&
    !input.fire &&
    !input.horizontal &&
    !input.vertical
  )
    return { state, sounds };
  let next: PangState = {
    ...state,
    balls: state.balls.map((ball) => ({ ...ball })),
    shots: state.shots.map((shot) => ({ ...shot })),
    bonuses: state.bonuses.map((bonus) => ({ ...bonus })),
    broken: [...state.broken],
    pops: state.pops.map((pop) => ({ ...pop })),
  };
  if (next.phase === 'ready') next.phase = 'playing';
  let remaining = Math.min(0.1, Math.max(0, seconds));
  while (remaining > 0) {
    const dt = Math.min(1 / 240, remaining);
    remaining -= dt;
    next.elapsed += dt;
    next.pops = next.pops.filter((pop) => {
      pop.age += dt;
      return pop.age < 0.25;
    });
    if (next.phase === 'dead' || next.phase === 'cleared') {
      next.phaseTime += dt + remaining;
      next.elapsed += remaining;
      if (next.phaseTime >= 1.25 || input.start) {
        const cleared = next.phase === 'cleared';
        next = setupLevel(
          { ...next, weapon: cleared ? next.weapon : 'normal' },
          next.level + Number(cleared),
        );
      }
      break;
    }
    if (next.phase !== 'playing') break;
    next.time = Math.max(0, next.time - dt);
    next.invincible = Math.max(0, next.invincible - dt);
    next.freeze = Math.max(0, next.freeze - dt);
    next.fireCooldown = Math.max(0, next.fireCooldown - dt);
    movePlayer(next, dt, input);
    const limit = next.weapon === 'double' ? 2 : 1;
    if (input.fire && next.fireCooldown <= 0 && next.shots.length < limit) {
      next.shots.push({
        id: next.nextId++,
        x: next.x,
        top: next.y - 25,
        bottom: next.y,
        weapon: next.weapon,
        stuck: -1,
      });
      next.fireCooldown = 0.24;
      sounds.push('shoot');
    }
    const blocks = activePlatforms(next);
    if (next.freeze <= 0)
      for (const ball of next.balls) moveBall(ball, dt, blocks);
    for (const shot of [...next.shots]) {
      if (shot.stuck >= 0) {
        shot.stuck -= dt;
        if (shot.stuck <= 0) {
          next.shots = next.shots.filter((item) => item.id !== shot.id);
          continue;
        }
      } else {
        shot.top -= 180 * dt;
        const obstruction = blocks
          .filter(
            (block) =>
              !next.broken.includes(block.id) &&
              shot.x + 2 > block.x &&
              shot.x - 2 < block.x + block.width &&
              block.y + block.height <= shot.bottom &&
              shot.top <= block.y + block.height,
          )
          .sort((a, b) => b.y - a.y)[0];
        if (obstruction) {
          shot.top = obstruction.y + obstruction.height;
          if (BREAKABLE.has(obstruction.type)) {
            next.broken.push(obstruction.id);
            dropBonus(
              next,
              obstruction.bonus,
              obstruction.x + obstruction.width / 2,
              obstruction.y,
            );
            award(next, 100);
            next.shots = next.shots.filter((item) => item.id !== shot.id);
            sounds.push('pop');
            continue;
          }
          if (shot.weapon === 'glue') shot.stuck = 2.4;
          else {
            next.shots = next.shots.filter((item) => item.id !== shot.id);
            continue;
          }
        } else if (shot.top <= 8) {
          shot.top = 8;
          if (shot.weapon === 'glue') shot.stuck = 2.4;
          else {
            next.shots = next.shots.filter((item) => item.id !== shot.id);
            continue;
          }
        }
      }
      const struck = next.balls
        .filter((ball) =>
          overlapsCircle(
            ball.x,
            ball.y,
            BALL_RADII[ball.size],
            shot.x - 2,
            shot.top,
            4,
            shot.bottom - shot.top,
          ),
        )
        .sort((a, b) => b.y - a.y)[0];
      if (struck) {
        splitBall(next, struck);
        next.shots = next.shots.filter((item) => item.id !== shot.id);
        sounds.push('pop');
      }
    }
    for (const bonus of [...next.bonuses]) {
      const previousY = bonus.y;
      bonus.y = Math.min(GROUND - 9, bonus.y + 75 * dt);
      for (const block of activePlatforms(next))
        if (
          previousY + 9 <= block.y + 0.5 &&
          bonus.y + 9 >= block.y &&
          bonus.x + 8 > block.x &&
          bonus.x - 8 < block.x + block.width
        )
          bonus.y = block.y - 9;
      bonus.life -= dt;
      const collected =
        Math.abs(next.x - bonus.x) < 17 &&
        bonus.y + 9 > next.y - 28 &&
        bonus.y - 9 < next.y;
      if (collected || bonus.life <= 0)
        next.bonuses = next.bonuses.filter((item) => item.id !== bonus.id);
      if (!collected) continue;
      sounds.push('collect');
      if (bonus.kind === 2) next.weapon = 'double';
      else if (bonus.kind === 3) next.weapon = 'glue';
      else if (bonus.kind === 6) next.freeze = 5;
      else if (bonus.kind === 7) {
        next.lives = Math.min(9, next.lives + 1);
        award(next, 1000);
      } else if (bonus.kind === 8) next.shield = true;
      else if (bonus.kind === 5) {
        for (let generation = 0; generation < 3; generation++)
          for (const ball of [...next.balls])
            if (ball.size < 3) splitBall(next, ball, false);
        sounds.push('pop');
      }
    }
    if (!next.balls.length) {
      award(next, Math.floor(next.time) * 100);
      next.phase = next.level === LEVELS.length ? 'won' : 'cleared';
      next.phaseTime = 0;
      next.shots = [];
      sounds.push('clear');
      break;
    }
    for (const ball of next.balls)
      if (
        overlapsCircle(
          ball.x,
          ball.y,
          BALL_RADII[ball.size],
          next.x - 8,
          next.y - 27,
          16,
          27,
        )
      ) {
        hitPlayer(next, sounds);
        break;
      }
    if (next.time <= 0 && next.phase === 'playing') {
      next.invincible = 0;
      next.shield = false;
      hitPlayer(next, sounds);
    }
    if (next.lives <= 0) break;
  }
  return { state: next, sounds };
}

export function isPangState(value: unknown): value is PangState {
  if (!value || typeof value !== 'object') return false;
  const state = value as PangState;
  if (
    state.version !== 1 ||
    !['ready', 'playing', 'dead', 'cleared'].includes(state.phase)
  )
    return false;
  if (
    !Number.isInteger(state.level) ||
    state.level < 1 ||
    state.level > LEVELS.length ||
    (state.phase === 'cleared' && state.level === LEVELS.length)
  )
    return false;
  if (
    ![
      state.x,
      state.y,
      state.velocity,
      state.time,
      state.elapsed,
      state.phaseTime,
      state.fireCooldown,
      state.freeze,
      state.invincible,
    ].every(Number.isFinite)
  )
    return false;
  if (
    state.x < 8 ||
    state.x > 312 ||
    state.y < 0 ||
    state.y > GROUND ||
    Math.abs(state.velocity) > 500 ||
    state.time < 0 ||
    state.time > 100 ||
    state.elapsed < 0 ||
    state.phaseTime < 0 ||
    state.phaseTime > 1.3 ||
    state.fireCooldown < 0 ||
    state.fireCooldown > 0.3 ||
    state.freeze < 0 ||
    state.freeze > 5 ||
    state.invincible < 0 ||
    state.invincible > 2
  )
    return false;
  if (
    ![state.lives, state.score, state.nextLife, state.seed, state.nextId].every(
      Number.isInteger,
    ) ||
    state.lives < 1 ||
    state.lives > 9 ||
    state.score < 0 ||
    state.nextLife <= state.score ||
    state.seed < 0 ||
    state.seed > 4294967295 ||
    state.nextId < 1
  )
    return false;
  if (
    ![-1, 1].includes(state.facing) ||
    typeof state.moving !== 'boolean' ||
    typeof state.shield !== 'boolean' ||
    !['normal', 'double', 'glue'].includes(state.weapon)
  )
    return false;
  if (
    state.climbing !== null &&
    (!Number.isInteger(state.climbing) ||
      state.climbing < 0 ||
      state.climbing >= LEVELS[state.level - 1].ladders.length)
  )
    return false;
  if (
    !Array.isArray(state.balls) ||
    state.balls.length > 256 ||
    !Array.isArray(state.shots) ||
    state.shots.length > 2 ||
    !Array.isArray(state.bonuses) ||
    state.bonuses.length > 64 ||
    !Array.isArray(state.pops) ||
    state.pops.length > 40 ||
    !Array.isArray(state.broken) ||
    state.broken.length > LEVELS[state.level - 1].platforms.length
  )
    return false;
  if (
    new Set(state.broken).size !== state.broken.length ||
    !state.broken.every(
      (id) =>
        Number.isInteger(id) &&
        id >= 0 &&
        id < LEVELS[state.level - 1].platforms.length &&
        BREAKABLE.has(LEVELS[state.level - 1].platforms[id].type),
    )
  )
    return false;
  const ids = new Set<number>();
  const validId = (id: number) => {
    if (!Number.isInteger(id) || id < 1 || id >= state.nextId || ids.has(id))
      return false;
    ids.add(id);
    return true;
  };
  const validBonus = (kind: number) =>
    kind === 0 || kind === 99 || BONUS_TYPES.includes(kind);
  for (const ball of state.balls)
    if (
      !ball ||
      !validId(ball.id) ||
      ![ball.x, ball.y, ball.vx, ball.vy, ball.bounce].every(Number.isFinite) ||
      !Number.isInteger(ball.size) ||
      ball.size < 0 ||
      ball.size > 3 ||
      ball.x < -30 ||
      ball.x > 350 ||
      ball.y < -30 ||
      ball.y > GROUND + 30 ||
      Math.abs(ball.vx) > 120 ||
      Math.abs(ball.vy) > 1000 ||
      ball.bounce < 1 ||
      ball.bounce > 700 ||
      !validBonus(ball.bonus) ||
      !validBonus(ball.childBonus)
    )
      return false;
  for (const shot of state.shots)
    if (
      !shot ||
      !validId(shot.id) ||
      ![shot.x, shot.top, shot.bottom, shot.stuck].every(Number.isFinite) ||
      shot.x < 8 ||
      shot.x > 312 ||
      shot.top < -30 ||
      shot.top > shot.bottom ||
      shot.bottom > GROUND ||
      shot.stuck < -1 ||
      shot.stuck > 2.4 ||
      !['normal', 'double', 'glue'].includes(shot.weapon)
    )
      return false;
  for (const bonus of state.bonuses)
    if (
      !bonus ||
      !validId(bonus.id) ||
      ![bonus.x, bonus.y, bonus.life].every(Number.isFinite) ||
      bonus.x < -30 ||
      bonus.x > 350 ||
      bonus.y < -30 ||
      bonus.y > GROUND ||
      bonus.life < 0 ||
      bonus.life > 10 ||
      !BONUS_TYPES.includes(bonus.kind)
    )
      return false;
  for (const pop of state.pops)
    if (
      !pop ||
      !validId(pop.id) ||
      ![pop.x, pop.y, pop.age].every(Number.isFinite) ||
      pop.age < 0 ||
      pop.age > 0.25 ||
      !Number.isInteger(pop.size) ||
      pop.size < 0 ||
      pop.size > 3
    )
      return false;
  return true;
}
