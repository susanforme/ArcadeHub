import maps from './levels.json';
import monsters from './monsters.json';
import stats from './towers.json';

export const WIDTH = 960;
export const HEIGHT = 740;
export const TILE = 80;
export type TowerKind = keyof typeof stats;
export interface Point {
  x: number;
  y: number;
}
export const LEVELS = maps;
export const TOWERS = stats;
export interface Tower extends Point {
  id: number;
  cell: number;
  kind: TowerKind;
  level: number;
  cooldown: number;
  angle: number;
}
export interface Enemy extends Point {
  id: number;
  kind: string;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  attack: number;
  distance: number;
  slow: number;
}
export interface Obstacle extends Point {
  id: number;
  kind: string;
  width: number;
  height: number;
  cells: number[];
  hp: number;
  maxHp: number;
  reward: number;
}
export interface Target {
  type: 'enemy' | 'obstacle';
  id: number;
}
export interface Shot extends Point {
  id: number;
  kind: TowerKind;
  level: number;
  target: Target;
  damage: number;
  speed: number;
  fromX: number;
  fromY: number;
}
export interface State {
  version: 1;
  level: number;
  gold: number;
  health: number;
  wave: number;
  spawned: number;
  timer: number;
  phase: 'ready' | 'running' | 'won' | 'lost';
  towers: Tower[];
  enemies: Enemy[];
  obstacles: Obstacle[];
  shots: Shot[];
  target: Target | null;
  nextId: number;
  score: number;
  best: number[];
  clock: number;
}
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function pathLength(level: number) {
  const p = LEVELS[level].path;
  return p.slice(1).reduce((sum, point, i) => sum + distance(p[i], point), 0);
}
export function pathPosition(level: number, travel: number): Point {
  const path = LEVELS[level].path;
  for (let i = 1; i < path.length; i++) {
    const length = distance(path[i - 1], path[i]);
    if (travel <= length) {
      const f = length ? travel / length : 0;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * f,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * f,
      };
    }
    travel -= length;
  }
  return { ...path[path.length - 1] };
}
export function cellPoint(cell: number): Point {
  return { x: (cell % 12) * 80 + 40, y: Math.floor(cell / 12) * 80 + 40 };
}
export function newGame(
  level = 0,
  best: number[] = Array(LEVELS.length).fill(0),
): State {
  const map = LEVELS[level];
  return {
    version: 1,
    level,
    gold: map.gold,
    health: 10,
    wave: 0,
    spawned: 0,
    timer: 3,
    phase: 'ready',
    towers: [],
    enemies: [],
    shots: [],
    target: null,
    nextId: 100,
    score: 0,
    best: [...best],
    clock: 0,
    obstacles: map.obstacles.map((o) => {
      const large = o.width * o.height > 6400;
      const hp = large ? 2000 : 800;
      return { ...o, hp, maxHp: hp, reward: large ? 150 : 50 };
    }),
  };
}
export function canBuild(s: State, cell: number) {
  if (
    !Number.isInteger(cell) ||
    cell < 12 ||
    cell >= 96 ||
    s.phase === 'won' ||
    s.phase === 'lost'
  )
    return false;
  if (
    s.towers.some((t) => t.cell === cell) ||
    s.obstacles.some((o) => o.cells.includes(cell))
  )
    return false;
  const map = LEVELS[s.level];
  if (
    !map.buildable.includes(cell) &&
    !map.obstacles.some(
      (o) =>
        o.cells.includes(cell) && !s.obstacles.some((live) => live.id === o.id),
    )
  )
    return false;
  const p = cellPoint(cell),
    path = LEVELS[s.level].path;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    const f = len2
      ? Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / len2,
          ),
        )
      : 0;
    if (
      distance(p, { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }) < 40
    )
      return false;
  }
  return true;
}
export function build(s: State, cell: number, kind: TowerKind) {
  const cost = TOWERS[kind][0].cost;
  if (
    !LEVELS[s.level].towers.includes(kind) ||
    !canBuild(s, cell) ||
    s.gold < cost
  )
    return false;
  s.gold -= cost;
  s.towers.push({
    ...cellPoint(cell),
    id: s.nextId++,
    cell,
    kind,
    level: 1,
    cooldown: 0,
    angle: 0,
  });
  return true;
}
export function upgrade(s: State, id: number) {
  const t = s.towers.find((t) => t.id === id);
  if (!t || t.level === 3 || s.phase === 'won' || s.phase === 'lost')
    return false;
  const cost = TOWERS[t.kind][t.level - 1].upgrade;
  if (s.gold < cost) return false;
  s.gold -= cost;
  t.level++;
  return true;
}
export function sell(s: State, id: number) {
  const i = s.towers.findIndex((t) => t.id === id);
  if (i < 0 || s.phase === 'won' || s.phase === 'lost') return false;
  const t = s.towers[i];
  s.gold += TOWERS[t.kind][t.level - 1].sell;
  s.towers.splice(i, 1);
  return true;
}
export function resolveTarget(s: State, target: Target) {
  return target.type === 'enemy'
    ? s.enemies.find((e) => e.id === target.id)
    : s.obstacles.find((o) => o.id === target.id);
}
function spawn(s: State) {
  const boss = s.wave === LEVELS[s.level].waves && s.spawned === 5;
  // Match the source's ten enemies per wave and five-wave difficulty tiers.
  const tier = Math.floor(s.wave / 5),
    number = 10 - (s.wave - 1) * 2;
  const types = [1, 2, 3, 7, 8, 11, 5, 4, 6, 9, 10, 12];
  const index = Math.min(types.length - 1, (s.spawned < number ? 0 : 3) + tier);
  const m = monsters[(boss ? 13 : types[index]) - 1];
  const hp = m.hp * (1 + Math.floor((s.wave - 1) / 5));
  s.enemies.push({
    ...LEVELS[s.level].path[0],
    id: s.nextId++,
    kind: m.kind,
    hp,
    maxHp: hp,
    speed: m.speed + tier * 10,
    reward: m.reward,
    attack: m.attack,
    distance: 0,
    slow: 0,
  });
  s.spawned++;
}
export function startWave(s: State) {
  if (s.phase === 'ready') {
    s.phase = 'running';
    s.wave = 1;
    s.timer = 0;
    return true;
  }
  return false;
}
function hurt(s: State, target: Target, damage: number, slow = 0) {
  const victim = resolveTarget(s, target);
  if (!victim) return;
  victim.hp -= damage;
  if (target.type === 'enemy')
    (victim as Enemy).slow = Math.max((victim as Enemy).slow, slow);
  if (victim.hp > 0) return;
  s.gold += victim.reward;
  s.score += victim.reward;
  if (target.type === 'enemy')
    s.enemies = s.enemies.filter((e) => e.id !== target.id);
  else s.obstacles = s.obstacles.filter((o) => o.id !== target.id);
  if (s.target?.id === target.id && s.target.type === target.type)
    s.target = null;
}
export function step(s: State, dt: number) {
  if (
    (s.phase !== 'running' && s.phase !== 'ready') ||
    !Number.isFinite(dt) ||
    dt <= 0
  )
    return;
  dt = Math.min(dt, 0.05);
  s.clock += dt;
  if (s.target && !resolveTarget(s, s.target)) s.target = null;
  if (s.phase === 'running') {
    s.timer = Math.max(0, s.timer - dt);
    if (s.spawned < 10 && s.timer <= 0) {
      spawn(s);
      s.timer = 1.5;
    }
    if (s.spawned === 10 && s.enemies.length === 0 && s.shots.length === 0) {
      if (s.wave === LEVELS[s.level].waves) {
        s.phase = 'won';
        s.best[s.level] = Math.max(s.best[s.level], s.health);
        s.score += s.health * 100 + 500;
        return;
      }
      s.wave++;
      s.spawned = 0;
      s.timer = 3;
      s.gold += 20;
    }
    for (const e of [...s.enemies]) {
      e.slow = Math.max(0, e.slow - dt);
      e.distance += e.speed * (e.slow > 0 ? 0.45 : 1) * dt;
      Object.assign(e, pathPosition(s.level, e.distance));
      if (e.distance >= pathLength(s.level)) {
        s.health = Math.max(0, s.health - e.attack);
        s.enemies = s.enemies.filter((v) => v.id !== e.id);
        if (s.health === 0) {
          s.phase = 'lost';
          s.shots = [];
          return;
        }
      }
    }
  }
  for (const t of s.towers) {
    t.cooldown -= dt;
    const data = TOWERS[t.kind][t.level - 1];
    const forced = s.target && resolveTarget(s, s.target);
    const enemy = s.enemies
      .filter((e) => distance(t, e) <= data.range)
      .sort((a, b) => b.distance - a.distance)[0];
    const target: Target | null =
      forced && distance(t, forced) <= data.range
        ? s.target
        : enemy
          ? { type: 'enemy', id: enemy.id }
          : null;
    const victim = target && resolveTarget(s, target);
    if (!victim || !target) continue;
    t.angle = Math.atan2(victim.y - t.y, victim.x - t.x) + Math.PI / 2;
    if (t.cooldown > 0) continue;
    t.cooldown = data.interval;
    s.shots.push({
      id: s.nextId++,
      x: t.x,
      y: t.y,
      fromX: t.x,
      fromY: t.y,
      kind: t.kind,
      level: t.level,
      target: { ...target },
      damage: data.damage,
      speed: data.speed,
    });
  }
  for (const shot of [...s.shots]) {
    const victim = resolveTarget(s, shot.target);
    if (!victim) {
      s.shots = s.shots.filter((v) => v.id !== shot.id);
      continue;
    }
    const d = distance(shot, victim),
      travel = shot.speed * dt;
    if (d > travel + 8) {
      shot.x += ((victim.x - shot.x) / d) * travel;
      shot.y += ((victim.y - shot.y) / d) * travel;
      continue;
    }
    const center = { x: victim.x, y: victim.y };
    hurt(
      s,
      shot.target,
      shot.damage,
      shot.kind === 'Shit' ? 2 + shot.level : 0,
    );
    if (shot.kind === 'Star' || shot.kind === 'Ball') {
      const radius = shot.kind === 'Star' ? 65 : 85;
      const neighbors = s.enemies.filter(
        (e) => e.id !== shot.target.id && distance(e, center) < radius,
      );
      for (const e of shot.kind === 'Ball'
        ? neighbors.slice(0, shot.level)
        : neighbors)
        hurt(s, { type: 'enemy', id: e.id }, shot.damage * 0.6);
    }
    if (shot.kind === 'Fan') {
      const dx = center.x - shot.fromX,
        dy = center.y - shot.fromY,
        len = Math.hypot(dx, dy);
      for (const e of [...s.enemies]) {
        const along = len
          ? ((e.x - shot.fromX) * dx + (e.y - shot.fromY) * dy) / len
          : 0;
        const across = len
          ? Math.abs((e.x - shot.fromX) * dy - (e.y - shot.fromY) * dx) / len
          : 100;
        if (
          e.id !== shot.target.id &&
          along > 0 &&
          along < TOWERS.Fan[shot.level - 1].range &&
          across < 32
        )
          hurt(s, { type: 'enemy', id: e.id }, shot.damage);
      }
    }
    s.shots = s.shots.filter((v) => v.id !== shot.id);
  }
}
export function isState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State,
    finite = (v: unknown) =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0;
  if (
    s.version !== 1 ||
    !Number.isInteger(s.level) ||
    s.level < 0 ||
    s.level >= LEVELS.length ||
    !['ready', 'running', 'won', 'lost'].includes(s.phase)
  )
    return false;
  if (
    ![
      s.gold,
      s.health,
      s.wave,
      s.spawned,
      s.timer,
      s.nextId,
      s.score,
      s.clock,
    ].every(finite) ||
    s.health > 10 ||
    s.wave > LEVELS[s.level].waves ||
    s.spawned > 10
  )
    return false;
  if (
    !Array.isArray(s.best) ||
    s.best.length !== LEVELS.length ||
    !s.best.every((n) => Number.isInteger(n) && n >= 0 && n <= 10)
  )
    return false;
  const point = (p: Point) =>
    p && finite(p.x) && finite(p.y) && p.x <= WIDTH && p.y <= 640;
  const target = (t: Target) =>
    t &&
    ['enemy', 'obstacle'].includes(t.type) &&
    Number.isInteger(t.id) &&
    t.id > 0;
  if (![s.towers, s.enemies, s.obstacles, s.shots].every(Array.isArray))
    return false;
  if (s.target !== null && !target(s.target)) return false;
  if (
    !s.towers.every(
      (t) =>
        point(t) &&
        finite(t.id) &&
        Number.isInteger(t.cell) &&
        t.cell >= 12 &&
        t.cell < 96 &&
        Object.keys(TOWERS).includes(t.kind) &&
        LEVELS[s.level].towers.includes(t.kind) &&
        [1, 2, 3].includes(t.level) &&
        Number.isFinite(t.cooldown) &&
        Number.isFinite(t.angle),
    )
  )
    return false;
  if (
    !s.enemies.every(
      (e) =>
        point(e) &&
        finite(e.id) &&
        monsters.some((m) => m.kind === e.kind) &&
        [e.hp, e.maxHp, e.speed, e.reward, e.attack, e.distance, e.slow].every(
          finite,
        ) &&
        e.hp > 0 &&
        e.hp <= e.maxHp,
    )
  )
    return false;
  if (
    !s.obstacles.every(
      (o) =>
        point(o) &&
        LEVELS[s.level].obstacles.some(
          (v) =>
            v.id === o.id &&
            v.kind === o.kind &&
            v.cells.length === o.cells?.length &&
            v.cells.every((cell, i) => cell === o.cells[i]),
        ) &&
        [o.hp, o.maxHp, o.width, o.height, o.reward].every(finite) &&
        o.hp > 0 &&
        o.hp <= o.maxHp,
    )
  )
    return false;
  if (
    !s.shots.every(
      (b) =>
        point(b) &&
        finite(b.id) &&
        Object.keys(TOWERS).includes(b.kind) &&
        [1, 2, 3].includes(b.level) &&
        target(b.target) &&
        [b.damage, b.speed, b.fromX, b.fromY].every(finite),
    )
  )
    return false;
  const ids = [...s.towers, ...s.enemies, ...s.obstacles, ...s.shots].map(
    (v) => v.id,
  );
  return (
    new Set(ids).size === ids.length &&
    ids.every((id) => Number.isInteger(id) && id > 0 && id < s.nextId) &&
    new Set(s.towers.map((t) => t.cell)).size === s.towers.length
  );
}
