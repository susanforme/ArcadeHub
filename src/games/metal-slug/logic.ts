export const WIDTH = 640;
export const HEIGHT = 360;
export const GROUND = 302;
export const LEVEL_LENGTH = 4200;
export const STEP = 1 / 60;
export type EnemyKind =
  | 'soldier'
  | 'crab'
  | 'heli'
  | 'boss1'
  | 'boss2'
  | 'boss3';
export interface Actor {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  facing: number;
}
export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl: number;
  kind: 'bullet' | 'enemy' | 'grenade' | 'rock';
  damage: number;
}
export interface Effect {
  id: number;
  x: number;
  y: number;
  ttl: number;
}
export interface Pickup {
  id: number;
  x: number;
  kind: 'heavy' | 'health' | 'bombs';
  taken: boolean;
}
export interface SlugState {
  version: 1;
  level: number;
  phase: 'ready' | 'playing' | 'clear' | 'won' | 'over';
  time: number;
  transition: number;
  score: number;
  nextId: number;
  player: {
    x: number;
    y: number;
    vy: number;
    hp: number;
    facing: number;
    crouch: boolean;
    aimUp: boolean;
    moving: boolean;
    invulnerable: number;
    cooldown: number;
    firing: number;
    grenades: number;
    ammo: number;
  };
  enemies: Actor[];
  projectiles: Projectile[];
  effects: Effect[];
  pickups: Pickup[];
}
export interface SlugInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  fire: boolean;
  grenade: boolean;
}
export type SlugSound = 'shot' | 'heavy' | 'explosion' | 'pickup' | 'death';
export const platforms = [
  { x: 710, y: 240, width: 160 },
  { x: 1770, y: 230, width: 140 },
  { x: 2790, y: 238, width: 180 },
];
export function enemySize(kind: EnemyKind) {
  if (kind === 'boss1') return { w: 185, h: 185 };
  if (kind === 'boss2') return { w: 150, h: 110 };
  if (kind === 'boss3') return { w: 145, h: 170 };
  if (kind === 'heli') return { w: 95, h: 65 };
  return { w: kind === 'crab' ? 70 : 38, h: kind === 'crab' ? 48 : 58 };
}
export function newMission(level = 1, score = 0, hp = 100): SlugState {
  let id = 1;
  const enemies: Actor[] = Array.from({ length: 15 }, (_, i) => {
    const kind: EnemyKind =
      i % 5 === 4 ? 'heli' : (i + level) % 3 === 0 ? 'crab' : 'soldier';
    const maxHp = kind === 'crab' ? 75 : kind === 'heli' ? 100 : 50;
    return {
      id: id++,
      kind,
      x: 500 + i * 210,
      y: kind === 'heli' ? 155 : GROUND,
      hp: maxHp,
      maxHp,
      cooldown: 1 + (i % 3) * 0.4,
      facing: -1,
    };
  });
  const kind: EnemyKind =
    level === 1 ? 'boss1' : level === 2 ? 'boss2' : 'boss3';
  const maxHp = 650 + level * 150;
  enemies.push({
    id: id++,
    kind,
    x: LEVEL_LENGTH - 210,
    y: level === 1 ? GROUND : 205,
    hp: maxHp,
    maxHp,
    cooldown: 2,
    facing: -1,
  });
  return {
    version: 1,
    level,
    phase: 'ready',
    time: 0,
    transition: 0,
    score,
    nextId: id + 3,
    player: {
      x: 90,
      y: GROUND,
      vy: 0,
      hp,
      facing: 1,
      crouch: false,
      aimUp: false,
      moving: false,
      invulnerable: 0,
      cooldown: 0,
      firing: 0,
      grenades: 10,
      ammo: 0,
    },
    enemies,
    projectiles: [],
    effects: [],
    pickups: [
      { id: id++, x: 900, kind: 'heavy', taken: false },
      { id: id++, x: 2000, kind: 'health', taken: false },
      { id: id++, x: 3200, kind: 'bombs', taken: false },
    ],
  };
}
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
function hitEnemy(state: SlugState, enemy: Actor, damage: number) {
  if (enemy.hp <= 0) return;
  enemy.hp = Math.max(0, enemy.hp - damage);
  if (!enemy.hp) {
    state.score += enemy.kind.startsWith('boss')
      ? 3000
      : enemy.kind === 'heli'
        ? 300
        : 100;
    state.effects.push({
      id: state.nextId++,
      x: enemy.x,
      y: enemy.y - enemySize(enemy.kind).h / 2,
      ttl: 0.5,
    });
  }
}
function hurtPlayer(state: SlugState, damage: number) {
  const p = state.player;
  if (p.invulnerable > 0 || p.hp <= 0) return;
  p.hp = Math.max(0, p.hp - damage);
  p.invulnerable = 0.9;
  if (!p.hp) state.phase = 'over';
}
function explode(state: SlugState, x: number, y: number) {
  state.effects.push({ id: state.nextId++, x, y, ttl: 0.6 });
  for (const enemy of state.enemies) {
    const { w, h } = enemySize(enemy.kind);
    if (
      Math.abs(enemy.x - x) < 115 + w / 2 &&
      Math.abs(enemy.y - h / 2 - y) < 100 + h / 2
    )
      hitEnemy(state, enemy, 200);
  }
}
function shot(
  state: SlugState,
  x: number,
  y: number,
  vx: number,
  vy: number,
  kind: Projectile['kind'],
  damage: number,
) {
  state.projectiles.push({
    id: state.nextId++,
    x,
    y,
    vx,
    vy,
    kind,
    damage,
    ttl: kind === 'grenade' ? 1.1 : 4,
  });
}

// Fixed 60 Hz rules keep movement, hit detection and saves independent of render FPS.
export function stepSlug(state: SlugState, input: SlugInput): SlugSound[] {
  const sounds: SlugSound[] = [];
  if (state.phase === 'won' || state.phase === 'over') return sounds;
  if (state.phase === 'ready') {
    if (input.fire || input.jump || input.left || input.right)
      state.phase = 'playing';
    else return sounds;
  }
  if (state.phase === 'clear') {
    state.transition += STEP;
    if (state.transition >= 2.5) {
      if (state.level === 3) state.phase = 'won';
      else
        Object.assign(
          state,
          newMission(
            state.level + 1,
            state.score,
            Math.min(100, state.player.hp + 30),
          ),
          { phase: 'playing' },
        );
    }
    return sounds;
  }
  state.time += STEP;
  const p = state.player;
  p.cooldown = Math.max(0, p.cooldown - STEP);
  p.invulnerable = Math.max(0, p.invulnerable - STEP);
  p.firing = Math.max(0, p.firing - STEP);
  p.crouch = input.down && p.y >= GROUND;
  p.aimUp = input.up;
  const movement = Number(input.right) - Number(input.left);
  p.moving = movement !== 0;
  if (movement) p.facing = movement;
  const boss = state.enemies.find((enemy) => enemy.kind.startsWith('boss'));
  const inArena = p.x > LEVEL_LENGTH - WIDTH;
  p.x = clamp(
    p.x + movement * (p.crouch ? 70 : 150) * STEP,
    inArena && boss && boss.hp > 0 ? LEVEL_LENGTH - WIDTH : 20,
    LEVEL_LENGTH - 35,
  );
  const onPlatform = platforms.some(
    (platform) =>
      p.y === platform.y &&
      p.x > platform.x - 8 &&
      p.x < platform.x + platform.width + 8,
  );
  if (input.jump && (p.y >= GROUND || onPlatform) && !p.crouch) p.vy = -380;
  const oldY = p.y;
  p.vy += 1000 * STEP;
  p.y += p.vy * STEP;
  for (const platform of [
    ...platforms,
    { x: 0, y: GROUND, width: LEVEL_LENGTH },
  ]) {
    if (
      p.vy >= 0 &&
      oldY <= platform.y &&
      p.y >= platform.y &&
      p.x > platform.x - 8 &&
      p.x < platform.x + platform.width + 8
    ) {
      p.y = platform.y;
      p.vy = 0;
    }
  }
  const muzzleY = p.y - (p.crouch ? 20 : 43);
  if (input.fire && p.cooldown <= 0) {
    const melee =
      !p.aimUp &&
      state.enemies.find(
        (enemy) =>
          enemy.hp > 0 &&
          Math.abs(enemy.x - p.x) < 58 &&
          (enemy.x - p.x) * p.facing >= 0 &&
          Math.abs(enemy.y - p.y) < 45,
      );
    if (melee) hitEnemy(state, melee, 200);
    else {
      const heavy = p.ammo > 0;
      shot(
        state,
        p.x + (p.aimUp ? 0 : p.facing * 27),
        muzzleY,
        p.aimUp ? 0 : p.facing * 650,
        p.aimUp ? -650 : 0,
        'bullet',
        heavy ? 20 : 25,
      );
      if (heavy) p.ammo--;
      sounds.push(heavy ? 'heavy' : 'shot');
    }
    p.cooldown = p.ammo > 0 ? 0.1 : 0.3;
    p.firing = 0.15;
  }
  if (input.grenade && p.grenades > 0) {
    p.grenades--;
    shot(
      state,
      p.x + p.facing * 20,
      muzzleY,
      p.facing * 245,
      -260,
      'grenade',
      200,
    );
  }
  for (const pickup of state.pickups) {
    if (!pickup.taken && Math.abs(pickup.x - p.x) < 30 && p.y > GROUND - 55) {
      pickup.taken = true;
      if (pickup.kind === 'heavy') p.ammo += 120;
      else if (pickup.kind === 'bombs') p.grenades += 10;
      else p.hp = Math.min(100, p.hp + 20);
      state.score += 100;
      sounds.push('pickup');
    }
  }
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0 || Math.abs(enemy.x - p.x) > 540) continue;
    const isBoss = enemy.kind.startsWith('boss');
    const distance = p.x - enemy.x;
    enemy.facing = distance >= 0 ? 1 : -1;
    enemy.cooldown -= STEP;
    if (!isBoss && Math.abs(distance) > (enemy.kind === 'soldier' ? 160 : 40))
      enemy.x += enemy.facing * (enemy.kind === 'heli' ? 40 : 34) * STEP;
    if (enemy.kind === 'boss3') enemy.y = 205 + Math.sin(state.time * 1.5) * 35;
    if (enemy.cooldown <= 0) {
      if (enemy.kind === 'crab') {
        if (Math.abs(distance) < 60 && Math.abs(p.y - enemy.y) < 45)
          hurtPlayer(state, 10);
        enemy.cooldown = 0.8;
      } else if (enemy.kind === 'boss2') {
        // The original UFO marks a target before dropping a rock on that position.
        shot(state, p.x, 15, 0, 0, 'rock', 25);
        enemy.cooldown = 2.4;
      } else {
        const y = enemy.y - (isBoss ? 90 : 35);
        const dx = p.x - enemy.x,
          dy = muzzleY - y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const speed = isBoss ? 190 : 150;
        const spread = enemy.kind === 'boss3' ? [-0.32, 0, 0.32] : [0];
        for (const angle of spread) {
          shot(
            state,
            enemy.x,
            y,
            ((dx * Math.cos(angle) - dy * Math.sin(angle)) / length) * speed,
            ((dx * Math.sin(angle) + dy * Math.cos(angle)) / length) * speed,
            'enemy',
            isBoss ? 25 : 10,
          );
        }
        enemy.cooldown = isBoss
          ? enemy.hp < enemy.maxHp / 2
            ? 0.9
            : 1.5
          : 2.1;
      }
    }
    const size = enemySize(enemy.kind);
    if (
      Math.abs(distance) < size.w / 2 + 10 &&
      p.y > enemy.y - size.h &&
      p.y - 40 < enemy.y
    )
      hurtPlayer(state, isBoss ? 25 : 10);
  }
  const effectsBefore = state.effects.length;
  for (const projectile of state.projectiles) {
    projectile.ttl -= STEP;
    if (projectile.kind === 'rock') {
      if (projectile.ttl > 2.8) continue;
      projectile.vy += 600 * STEP;
    }
    if (projectile.kind === 'grenade') projectile.vy += 650 * STEP;
    projectile.x += projectile.vx * STEP;
    projectile.y += projectile.vy * STEP;
    if (projectile.kind === 'grenade') {
      if (projectile.ttl <= 0 || projectile.y >= GROUND - 6) {
        explode(state, projectile.x, Math.min(projectile.y, GROUND - 10));
        sounds.push('explosion');
        projectile.ttl = 0;
      }
    } else if (projectile.kind === 'bullet') {
      for (const enemy of state.enemies) {
        const { w, h } = enemySize(enemy.kind);
        if (
          enemy.hp > 0 &&
          Math.abs(projectile.x - enemy.x) < w / 2 + 5 &&
          projectile.y > enemy.y - h &&
          projectile.y < enemy.y + 5
        ) {
          hitEnemy(state, enemy, projectile.damage);
          projectile.ttl = 0;
          break;
        }
      }
    } else if (
      Math.abs(projectile.x - p.x) < (p.crouch ? 20 : 14) &&
      projectile.y > p.y - (p.crouch ? 28 : 58) &&
      projectile.y < p.y
    ) {
      hurtPlayer(state, projectile.damage);
      projectile.ttl = 0;
    }
    if (projectile.y >= GROUND && projectile.kind === 'rock')
      projectile.ttl = 0;
  }
  if (state.effects.length > effectsBefore && !sounds.includes('explosion'))
    sounds.push('explosion');
  state.projectiles = state.projectiles.filter(
    (v) =>
      v.ttl > 0 &&
      v.x > 0 &&
      v.x < LEVEL_LENGTH &&
      v.y > -100 &&
      v.y < HEIGHT + 20,
  );
  state.effects = state.effects.filter((effect) => {
    effect.ttl -= STEP;
    return effect.ttl > 0;
  });
  if (p.hp === 0) sounds.push('death');
  else if (boss?.hp === 0) {
    state.phase = 'clear';
    state.transition = 0;
    state.projectiles = [];
  }
  return sounds;
}

export function isSlugState(value: unknown): value is SlugState {
  if (!value || typeof value !== 'object') return false;
  const s = value as SlugState;
  const number = (n: unknown, min: number, max: number) =>
    typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
  const integer = (n: unknown, min: number, max: number) =>
    number(n, min, max) && Number.isInteger(n);
  if (
    s.version !== 1 ||
    !integer(s.level, 1, 3) ||
    !['ready', 'playing', 'clear'].includes(s.phase) ||
    !number(s.time, 0, 1e9) ||
    !number(s.transition, 0, 3) ||
    !integer(s.score, 0, 1e9) ||
    !integer(s.nextId, 1, 1e9)
  )
    return false;
  const p = s.player;
  if (
    !p ||
    !number(p.x, 0, LEVEL_LENGTH) ||
    !number(p.y, -1000, GROUND) ||
    !number(p.vy, -500, 1000) ||
    !number(p.hp, 1, 100) ||
    ![-1, 1].includes(p.facing) ||
    !['crouch', 'aimUp', 'moving'].every(
      (key) => typeof p[key as keyof typeof p] === 'boolean',
    ) ||
    !number(p.invulnerable, 0, 1) ||
    !number(p.cooldown, 0, 1) ||
    !number(p.firing, 0, 1) ||
    !integer(p.ammo, 0, 1000) ||
    !integer(p.grenades, 0, 100)
  )
    return false;
  if (
    !Array.isArray(s.enemies) ||
    s.enemies.length !== 16 ||
    !Array.isArray(s.projectiles) ||
    s.projectiles.length > 200 ||
    !Array.isArray(s.effects) ||
    s.effects.length > 100 ||
    !Array.isArray(s.pickups) ||
    s.pickups.length !== 3
  )
    return false;
  const ids = new Set<number>();
  const validId = (entry: { id: number } | null) => {
    if (!entry || !integer(entry.id, 1, s.nextId - 1) || ids.has(entry.id))
      return false;
    ids.add(entry.id);
    return true;
  };
  const expected = newMission(s.level);
  return (
    s.enemies.every(
      (e, i) =>
        validId(e) &&
        e.kind === expected.enemies[i].kind &&
        number(e.x, 0, LEVEL_LENGTH) &&
        number(e.y, 0, GROUND) &&
        e.maxHp === expected.enemies[i].maxHp &&
        number(e.hp, 0, e.maxHp) &&
        number(e.cooldown, -1, 3) &&
        [-1, 1].includes(e.facing),
    ) &&
    s.projectiles.every(
      (v) =>
        validId(v) &&
        ['bullet', 'enemy', 'grenade', 'rock'].includes(v.kind) &&
        number(v.x, 0, LEVEL_LENGTH) &&
        number(v.y, -100, HEIGHT + 20) &&
        number(v.vx, -700, 700) &&
        number(v.vy, -700, 3000) &&
        number(v.ttl, 0, 4) &&
        number(v.damage, 1, 200),
    ) &&
    s.effects.every(
      (e) =>
        validId(e) &&
        number(e.x, 0, LEVEL_LENGTH) &&
        number(e.y, -100, HEIGHT) &&
        number(e.ttl, 0, 1),
    ) &&
    s.pickups.every(
      (v, i) =>
        validId(v) &&
        v.kind === expected.pickups[i].kind &&
        v.x === expected.pickups[i].x &&
        typeof v.taken === 'boolean',
    ) &&
    (s.phase === 'clear' ? s.enemies[15].hp === 0 : s.enemies[15].hp > 0)
  );
}
