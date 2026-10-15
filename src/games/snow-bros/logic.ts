export const WIDTH = 512;
export const HEIGHT = 480;
export const STEP = 1 / 60;
export const SNOW_HITS = 4;
export const GROUND = 192;
const GRAVITY = 700;
const JUMP_SPEED = 278;
const LEFT = 16;
const RIGHT = 240;

export interface Platform {
  x: number;
  y: number;
  width: number;
}
type Kind = 'goblin' | 'monkey' | 'spitter';
interface Spawn {
  x: number;
  y: number;
  kind: Kind;
}
interface Stage {
  column: number;
  platforms: Platform[];
  enemies: Spawn[];
}
const platform = (x: number, y: number, width: number): Platform => ({
  x,
  y,
  width,
});
const spawn = (x: number, y: number, kind: Kind = 'goblin'): Spawn => ({
  x,
  y,
  kind,
});

// Coordinates follow the visible tops of Ragey's original 256 x 208 level images.
export const STAGES: Stage[] = [
  {
    column: 0,
    platforms: [
      platform(0, 64, 112),
      platform(48, 96, 96),
      platform(176, 112, 80),
      platform(0, 128, 112),
      platform(48, 160, 96),
      platform(0, GROUND, 256),
    ],
    enemies: [
      spawn(66, 64),
      spawn(104, 96),
      spawn(208, 112, 'monkey'),
      spawn(44, 128),
      spawn(114, 160),
    ],
  },
  {
    column: 1,
    platforms: [
      platform(32, 96, 192),
      platform(0, 128, 96),
      platform(160, 128, 96),
      platform(32, 160, 80),
      platform(144, 160, 80),
      platform(0, GROUND, 256),
    ],
    enemies: [
      spawn(60, 96, 'monkey'),
      spawn(196, 96),
      spawn(48, 128, 'spitter'),
      spawn(208, 128),
      spawn(70, 160),
      spawn(188, 160, 'monkey'),
    ],
  },
  {
    column: 2,
    platforms: [
      platform(32, 128, 80),
      platform(144, 128, 80),
      platform(32, 160, 80),
      platform(144, 160, 80),
      platform(0, GROUND, 256),
    ],
    enemies: [
      spawn(48, 128, 'spitter'),
      spawn(94, 128, 'monkey'),
      spawn(164, 128, 'spitter'),
      spawn(208, 128),
      spawn(74, 160, 'monkey'),
      spawn(184, 160),
      spawn(215, 192),
    ],
  },
  {
    column: 3,
    platforms: [
      platform(0, 64, 96),
      platform(160, 64, 96),
      platform(48, 96, 160),
      platform(0, 128, 96),
      platform(160, 128, 96),
      platform(48, 160, 160),
      platform(0, GROUND, 256),
    ],
    enemies: [
      spawn(48, 64, 'spitter'),
      spawn(208, 64, 'spitter'),
      spawn(82, 96, 'monkey'),
      spawn(174, 96, 'monkey'),
      spawn(48, 128),
      spawn(210, 128),
      spawn(96, 160, 'monkey'),
      spawn(172, 160, 'spitter'),
    ],
  },
];

interface Body {
  x: number;
  y: number;
  vy: number;
  facing: number;
}
export interface Enemy extends Body {
  id: number;
  kind: Kind;
  snow: number;
  thaw: number;
  rolling: boolean;
  life: number;
  combo: number;
  cooldown: number;
}
interface Shot {
  id: number;
  x: number;
  y: number;
  vx: number;
  ttl: number;
  hostile: boolean;
}
interface Pickup {
  id: number;
  x: number;
  y: number;
  vy: number;
  value: number;
  ttl: number;
  frame: number;
}
export interface SnowState {
  version: 1;
  stage: number;
  phase: 'ready' | 'playing' | 'clear' | 'won' | 'over';
  time: number;
  remaining: number;
  transition: number;
  lives: number;
  score: number;
  nextId: number;
  bestCombo: number;
  comboTime: number;
  player: Body & {
    cooldown: number;
    firing: number;
    invulnerable: number;
    moving: boolean;
  };
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
}
export interface SnowInput {
  move: number;
  jump: boolean;
  fire: boolean;
  start: boolean;
}
export type SnowSound =
  | 'shot'
  | 'jump'
  | 'freeze'
  | 'roll'
  | 'hit'
  | 'clear'
  | 'pickup';

function player(): SnowState['player'] {
  return {
    x: 32,
    y: GROUND,
    vy: 0,
    facing: 1,
    cooldown: 0,
    firing: 0,
    invulnerable: 2,
    moving: false,
  };
}

export function newSnow(stage = 0, score = 0, lives = 3): SnowState {
  const enemies = STAGES[stage].enemies.map((enemy, i) => ({
    ...enemy,
    id: i + 1,
    vy: 0,
    facing: i % 2 ? -1 : 1,
    snow: 0,
    thaw: 0,
    rolling: false,
    life: 0,
    combo: 0,
    cooldown: 0.8 + i * 0.3,
  }));
  return {
    version: 1,
    stage,
    phase: 'ready',
    time: 0,
    remaining: 90,
    transition: 0,
    lives,
    score,
    nextId: enemies.length + 1,
    bestCombo: 0,
    comboTime: 0,
    player: player(),
    enemies,
    shots: [],
    pickups: [],
  };
}

function support(body: Body, platforms: Platform[]) {
  return platforms.find(
    (p) =>
      Math.abs(body.y - p.y) < 0.1 &&
      body.x > p.x - 5 &&
      body.x < p.x + p.width + 5,
  );
}

function fall(body: Body, platforms: Platform[], dt: number) {
  const before = body.y;
  body.vy += GRAVITY * dt;
  body.y += body.vy * dt;
  if (body.vy >= 0) {
    const hit = platforms
      .filter(
        (p) =>
          before <= p.y + 0.1 &&
          body.y >= p.y &&
          body.x > p.x - 5 &&
          body.x < p.x + p.width + 5,
      )
      .sort((a, b) => a.y - b.y)[0];
    if (hit) {
      body.y = hit.y;
      body.vy = 0;
    }
  }
  if (body.y < 27) {
    body.y = 27;
    body.vy = Math.max(0, body.vy);
  }
}

function reward(state: SnowState, enemy: Enemy, combo: number) {
  const value = 100 * Math.min(16, 2 ** Math.min(combo - 1, 4));
  state.score += value;
  state.bestCombo = Math.max(state.bestCombo, combo);
  state.comboTime = 2;
  if (state.pickups.length < 24)
    state.pickups.push({
      id: state.nextId++,
      x: enemy.x,
      y: enemy.y - 10,
      vy: -110,
      value: value * 2,
      ttl: 8,
      frame: (enemy.id + combo) % 4,
    });
}

function hurt(state: SnowState, sounds: SnowSound[]) {
  if (state.phase !== 'playing' || state.player.invulnerable > 0) return;
  state.lives--;
  sounds.push('hit');
  if (state.lives <= 0) {
    state.phase = 'over';
    return;
  }
  state.player = player();
  state.remaining = Math.max(45, state.remaining);
  state.shots = state.shots.filter((shot) => !shot.hostile);
}

function push(state: SnowState, enemy: Enemy, sounds: SnowSound[]) {
  enemy.rolling = true;
  enemy.facing = state.player.facing;
  enemy.life = 4.5;
  enemy.combo = 1;
  reward(state, enemy, 1);
  sounds.push('roll');
}

export function stepSnow(
  state: SnowState,
  input: SnowInput,
  dt = STEP,
): SnowSound[] {
  const sounds: SnowSound[] = [];
  if (state.phase === 'won' || state.phase === 'over') return sounds;
  dt = Math.max(0, Math.min(dt, STEP));
  if (state.phase === 'ready') {
    if (input.start || input.jump || input.fire || input.move)
      state.phase = 'playing';
    return sounds;
  }
  state.time += dt;
  if (state.phase === 'clear') {
    state.transition -= dt;
    if (state.transition <= 0) {
      if (state.stage === STAGES.length - 1) state.phase = 'won';
      else {
        const next = newSnow(state.stage + 1, state.score, state.lives);
        next.phase = 'playing';
        next.bestCombo = state.bestCombo;
        Object.assign(state, next);
      }
    }
    return sounds;
  }

  const platforms = STAGES[state.stage].platforms;
  let hero = state.player;
  state.remaining = Math.max(0, state.remaining - dt);
  state.comboTime = Math.max(0, state.comboTime - dt);
  hero.cooldown = Math.max(0, hero.cooldown - dt);
  hero.firing = Math.max(0, hero.firing - dt);
  hero.invulnerable = Math.max(0, hero.invulnerable - dt);
  const move = Math.sign(input.move);
  hero.moving = move !== 0;
  if (move) hero.facing = move;
  if (input.jump && support(hero, platforms)) {
    hero.vy = -JUMP_SPEED;
    sounds.push('jump');
  }
  hero.x = Math.max(LEFT, Math.min(RIGHT, hero.x + move * 96 * dt));
  fall(hero, platforms, dt);
  if (input.fire && hero.cooldown <= 0) {
    const ball = state.enemies.find(
      (enemy) =>
        enemy.snow === SNOW_HITS &&
        !enemy.rolling &&
        Math.abs(enemy.y - hero.y) < 23 &&
        (enemy.x - hero.x) * hero.facing >= -5 &&
        (enemy.x - hero.x) * hero.facing < 35,
    );
    hero.cooldown = 0.18;
    hero.firing = 0.14;
    if (ball) push(state, ball, sounds);
    else {
      state.shots.push({
        id: state.nextId++,
        x: hero.x + hero.facing * 13,
        y: hero.y - 15,
        vx: hero.facing * 210,
        ttl: 0.46,
        hostile: false,
      });
      sounds.push('shot');
    }
  }

  const removed = new Set<number>();
  for (const enemy of state.enemies) {
    if (removed.has(enemy.id)) continue;
    enemy.cooldown = Math.max(0, enemy.cooldown - dt);
    if (enemy.rolling) {
      enemy.life -= dt;
      enemy.x += enemy.facing * 212 * dt;
      if (enemy.x <= LEFT || enemy.x >= RIGHT) {
        enemy.x = Math.max(LEFT, Math.min(RIGHT, enemy.x));
        enemy.facing *= -1;
        // A wall bounce drops the ball to the next shelf, keeping upper-floor chains moving.
        if (enemy.y < GROUND) enemy.y += 3;
        else enemy.life = Math.min(enemy.life, 0.3);
      }
      fall(enemy, platforms, dt);
      for (const target of state.enemies) {
        if (target.id === enemy.id || target.rolling || removed.has(target.id))
          continue;
        if (
          Math.abs(target.x - enemy.x) < 22 &&
          Math.abs(target.y - enemy.y) < 23
        ) {
          enemy.combo++;
          reward(state, target, enemy.combo);
          removed.add(target.id);
          sounds.push('roll');
        }
      }
      if (enemy.life <= 0) removed.add(enemy.id);
      continue;
    }

    if (enemy.snow > 0) {
      enemy.thaw -= dt;
      if (enemy.thaw <= 0) {
        enemy.snow--;
        enemy.thaw = enemy.snow === SNOW_HITS - 1 ? 1.4 : 0.7;
      }
      fall(enemy, platforms, dt);
      continue;
    }

    const floor = support(enemy, platforms);
    const distance = hero.x - enemy.x;
    if (enemy.cooldown <= 0) {
      if (Math.abs(distance) > 6) enemy.facing = Math.sign(distance);
      if (floor && hero.y < enemy.y - 20 && Math.abs(distance) < 105)
        enemy.vy = -(enemy.kind === 'monkey' ? 270 : 248);
      if (
        enemy.kind === 'spitter' &&
        Math.abs(hero.y - enemy.y) < 25 &&
        Math.abs(distance) < 160
      ) {
        state.shots.push({
          id: state.nextId++,
          x: enemy.x + enemy.facing * 14,
          y: enemy.y - 13,
          vx: enemy.facing * 95,
          ttl: 1.7,
          hostile: true,
        });
      }
      enemy.cooldown = enemy.kind === 'monkey' ? 0.9 : 1.8;
    }
    const speed =
      enemy.kind === 'monkey' ? 49 : enemy.kind === 'spitter' ? 24 : 34;
    if (
      floor &&
      hero.y <= enemy.y + 16 &&
      (enemy.x + enemy.facing * 10 < floor.x ||
        enemy.x + enemy.facing * 10 > floor.x + floor.width)
    )
      enemy.facing *= -1;
    enemy.x += enemy.facing * speed * dt;
    if (enemy.x <= LEFT || enemy.x >= RIGHT) {
      enemy.x = Math.max(LEFT, Math.min(RIGHT, enemy.x));
      enemy.facing *= -1;
    }
    fall(enemy, platforms, dt);
  }

  for (const shot of state.shots) {
    shot.x += shot.vx * dt;
    shot.ttl -= dt;
    if (shot.hostile) {
      if (
        Math.abs(shot.x - hero.x) < 12 &&
        Math.abs(shot.y - (hero.y - 13)) < 13
      ) {
        shot.ttl = 0;
        hurt(state, sounds);
        hero = state.player;
      }
      continue;
    }
    const target = state.enemies.find(
      (enemy) =>
        !removed.has(enemy.id) &&
        !enemy.rolling &&
        Math.abs(shot.x - enemy.x) < 13 &&
        Math.abs(shot.y - (enemy.y - 14)) < 17,
    );
    if (target) {
      shot.ttl = 0;
      if (target.snow < SNOW_HITS) {
        target.snow++;
        target.thaw = target.snow === SNOW_HITS ? 6 : 1.6;
        if (target.snow === SNOW_HITS) sounds.push('freeze');
      }
    }
  }
  state.shots = state.shots.filter(
    (shot) => shot.ttl > 0 && shot.x > 0 && shot.x < 256,
  );
  state.enemies = state.enemies.filter((enemy) => !removed.has(enemy.id));

  for (const enemy of state.enemies) {
    if (
      !enemy.rolling &&
      enemy.snow === 0 &&
      Math.abs(enemy.x - hero.x) < 15 &&
      Math.abs(enemy.y - hero.y) < 23
    ) {
      hurt(state, sounds);
      hero = state.player;
    }
  }
  for (const item of state.pickups) {
    item.ttl -= dt;
    const body = { ...item, facing: 1 };
    fall(body, platforms, dt);
    item.y = body.y;
    item.vy = body.vy;
    if (
      Math.abs(item.x - hero.x) < 16 &&
      Math.abs(item.y - (hero.y - 10)) < 20
    ) {
      state.score += item.value;
      item.ttl = 0;
      sounds.push('pickup');
    }
  }
  state.pickups = state.pickups.filter((item) => item.ttl > 0);
  if (state.remaining <= 0) {
    hero.invulnerable = 0;
    hurt(state, sounds);
  }
  if (state.phase === 'playing' && state.enemies.length === 0) {
    state.score +=
      Math.ceil(state.remaining) * 10 +
      state.pickups.reduce((sum, item) => sum + item.value, 0);
    state.pickups = [];
    state.phase = 'clear';
    state.transition = 2;
    sounds.push('clear');
  }
  return sounds;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const number = (value: unknown, min: number, max: number) =>
  typeof value === 'number' &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const integer = (value: unknown, min: number, max: number) =>
  number(value, min, max) && Number.isInteger(value);
const body = (value: unknown): value is Record<string, unknown> =>
  record(value) &&
  number(value.x, 0, 256) &&
  number(value.y, 0, 208) &&
  number(value.vy, -400, 700) &&
  (value.facing === 1 || value.facing === -1);

export function isSnowState(value: unknown): value is SnowState {
  if (
    !record(value) ||
    value.version !== 1 ||
    !integer(value.stage, 0, STAGES.length - 1) ||
    !['ready', 'playing', 'clear'].includes(String(value.phase)) ||
    !number(value.time, 0, 10000) ||
    !number(value.remaining, 0, 90) ||
    !number(value.transition, -STEP, 2) ||
    !integer(value.lives, 1, 3) ||
    !integer(value.score, 0, 100000000) ||
    !integer(value.nextId, 1, 1000000) ||
    !integer(value.bestCombo, 0, 8) ||
    !number(value.comboTime, 0, 2) ||
    !body(value.player) ||
    !number(value.player.cooldown, 0, 0.18) ||
    !number(value.player.firing, 0, 0.14) ||
    !number(value.player.invulnerable, 0, 2) ||
    typeof value.player.moving !== 'boolean' ||
    !Array.isArray(value.enemies) ||
    value.enemies.length > 8 ||
    !Array.isArray(value.shots) ||
    value.shots.length > 64 ||
    !Array.isArray(value.pickups) ||
    value.pickups.length > 24
  )
    return false;
  const ids = new Set<number>();
  const validId = (item: Record<string, unknown>) => {
    if (
      !integer(item.id, 1, Number(value.nextId) - 1) ||
      ids.has(Number(item.id))
    )
      return false;
    ids.add(Number(item.id));
    return true;
  };
  return (
    value.enemies.every(
      (enemy: unknown) =>
        body(enemy) &&
        validId(enemy) &&
        ['goblin', 'monkey', 'spitter'].includes(String(enemy.kind)) &&
        integer(enemy.snow, 0, SNOW_HITS) &&
        number(enemy.thaw, -STEP, 6) &&
        typeof enemy.rolling === 'boolean' &&
        (!enemy.rolling || enemy.snow === SNOW_HITS) &&
        number(enemy.life, -STEP, 4.5) &&
        integer(enemy.combo, 0, 8) &&
        number(enemy.cooldown, 0, 3),
    ) &&
    value.shots.every(
      (shot: unknown) =>
        record(shot) &&
        validId(shot) &&
        number(shot.x, 0, 256) &&
        number(shot.y, 0, 208) &&
        number(shot.vx, -210, 210) &&
        number(shot.ttl, 0, 1.7) &&
        typeof shot.hostile === 'boolean',
    ) &&
    value.pickups.every(
      (item: unknown) =>
        record(item) &&
        validId(item) &&
        number(item.x, 0, 256) &&
        number(item.y, 0, 208) &&
        number(item.vy, -110, 700) &&
        integer(item.value, 0, 3200) &&
        number(item.ttl, 0, 8) &&
        integer(item.frame, 0, 3),
    ) &&
    (value.phase !== 'clear' || value.enemies.length === 0)
  );
}
