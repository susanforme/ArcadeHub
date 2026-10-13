import { describe, expect, test } from '@rstest/core';
import {
  actorPosition,
  chooseGhostDirection,
  DIRECTIONS,
  ghostTarget,
  isPacmanState,
  neighbor,
  newPacman,
  type PacmanState,
  stepPacman,
  walkable,
} from '../src/games/pacman/logic';
import { COLS, MAZE, ROWS, TOTAL_DOTS } from '../src/games/pacman/map';

function playing() {
  const s = newPacman();
  s.phase = 'playing';
  s.wait = 0;
  for (const g of s.ghosts) {
    g.mode = 'house';
    g.x = 13;
    g.y = 14;
    g.releaseAt = 1000;
  }
  return s;
}
function ticks(s: PacmanState, seconds: number) {
  const events = [];
  for (let i = 0; i < seconds * 120; i++)
    events.push(...stepPacman(s, 1 / 120, () => 0.25));
  return events;
}
describe('Pac-Man', () => {
  test('original maze has 244 reachable dots and four power pellets', () => {
    expect(MAZE).toHaveLength(ROWS);
    expect(MAZE.every((row) => row.length === COLS)).toBe(true);
    expect(TOTAL_DOTS).toBe(244);
    expect(MAZE.join('').split('o')).toHaveLength(5);
    const visited = new Set<number>([23 * COLS + 13]),
      queue = [{ x: 13, y: 23 }];
    for (let i = 0; i < queue.length; i++)
      for (const dir of DIRECTIONS) {
        const p = neighbor(queue[i].x, queue[i].y, dir),
          key = p.y * COLS + p.x;
        if (walkable(p.x, p.y) && !visited.has(key)) {
          visited.add(key);
          queue.push(p);
        }
      }
    newPacman().pellets.forEach((dot, i) => {
      if (dot) expect(visited.has(i)).toBe(true);
    });
    expect(walkable(13, 12)).toBe(false);
    expect(walkable(13, 12, true)).toBe(true);
  });
  test('ready countdown freezes all motion but accepts the queued direction', () => {
    const s = newPacman();
    s.wanted = 'RIGHT';
    ticks(s, 1);
    expect(s.player.x).toBe(13);
    expect(s.phase).toBe('ready');
    expect(s.wanted).toBe('RIGHT');
  });
  test('stops at walls and buffers a turn until the next valid intersection', () => {
    const s = playing();
    s.player = { x: 5, y: 5, dir: 'LEFT', progress: 0 };
    s.wanted = 'UP';
    ticks(s, 0.82);
    expect(s.player.x).toBe(1);
    expect(s.player.dir).toBe('UP');
    expect(actorPosition(s.player).y).toBeLessThan(5);
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    ticks(s, 1);
    expect(s.player).toEqual({ x: 1, y: 1, dir: 'LEFT', progress: 0 });
  });
  test('can reverse between tile centers without teleporting', () => {
    const s = playing();
    s.player = { x: 4, y: 5, dir: 'RIGHT', progress: 0.6 };
    s.wanted = 'LEFT';
    const before = actorPosition(s.player);
    stepPacman(s, 0);
    expect(actorPosition(s.player)).toEqual(before);
    expect(s.player.dir).toBe('LEFT');
    ticks(s, 0.1);
    expect(actorPosition(s.player).x).toBeLessThan(before.x);
  });
  test('wraps through the side tunnel, but never through another wall', () => {
    const s = playing();
    s.player = { x: 0, y: 14, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    ticks(s, 0.2);
    expect(s.player.x).toBe(27);
    expect(neighbor(0, 5, 'LEFT').x).toBe(-1);
  });
  test('regular dots score once and power pellets enable 200/400/800/1600 ghost combos', () => {
    const s = playing();
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    ticks(s, 0.1);
    expect(s.score).toBe(10);
    ticks(s, 0.1);
    expect(s.score).toBe(10);
    s.player = { x: 1, y: 3, dir: 'LEFT', progress: 0 };
    for (const g of s.ghosts)
      Object.assign(g, { x: 1, y: 3, dir: 'UP', progress: 0, mode: 'active' });
    const events = stepPacman(s, 1 / 120, () => 0);
    expect(events.filter((e) => e === 'ghost')).toHaveLength(4);
    expect(s.score).toBe(10 + 50 + 200 + 400 + 800 + 1600);
    expect(s.ghosts.every((g) => g.mode === 'eyes')).toBe(true);
    expect(s.power).toBe(6);
  });
  test('eyes return through the house door and respawn without being frightened', () => {
    const s = playing();
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    Object.assign(s.ghosts[0], { x: 13, y: 11, mode: 'eyes', scared: false });
    ticks(s, 0.5);
    expect(s.ghosts[0].mode).toBe('house');
    expect(s.ghosts[0].progress).toBe(0);
    ticks(s, 2);
    expect(s.ghosts[0].mode).toBe('active');
    expect(s.ghosts[0].scared).toBe(false);
  });
  test('collision costs a life, preserves eaten dots, and the last life ends the game', () => {
    const s = playing();
    s.player = { x: 3, y: 5, dir: 'RIGHT', progress: 0.7 };
    Object.assign(s.ghosts[0], {
      x: 4,
      y: 5,
      dir: 'LEFT',
      progress: 0.7,
      mode: 'active',
    });
    const dots = [...s.pellets];
    expect(stepPacman(s, 1 / 120)).toContain('death');
    expect(s.lives).toBe(2);
    expect(s.phase).toBe('dying');
    ticks(s, 1.5);
    expect(s.phase).toBe('ready');
    expect(s.pellets).toEqual(dots);
    s.lives = 1;
    s.phase = 'playing';
    s.wait = 0;
    Object.assign(s.ghosts[0], { ...s.player, mode: 'active' });
    stepPacman(s, 1 / 120);
    ticks(s, 1.5);
    expect(s.phase).toBe('over');
    expect(s.lives).toBe(0);
    expect(isPacmanState(s)).toBe(false);
  });
  test('power expiry makes a nearby ghost dangerous again', () => {
    const s = playing();
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    s.power = 0.001;
    Object.assign(s.ghosts[0], { ...s.player, mode: 'active', scared: true });
    expect(stepPacman(s, 1 / 120)).toContain('death');
    expect(s.power).toBe(0);
  });
  test('last dot advances the level and refreshes the maze without resetting the score', () => {
    const s = playing();
    s.pellets.fill(false);
    s.pellets[23 * COLS + 12] = true;
    ticks(s, 0.2);
    expect(s.phase).toBe('clear');
    expect(s.score).toBe(10);
    expect(isPacmanState(s)).toBe(true);
    ticks(s, 1.9);
    expect(s.level).toBe(2);
    expect(s.phase).toBe('ready');
    expect(s.pellets.filter(Boolean)).toHaveLength(244);
    expect(s.score).toBe(10);
  });
  test('fruit appears at 70 and 170 dots and an extra life is awarded only once', () => {
    const s = playing();
    let left = 70;
    for (let i = 0; i < s.pellets.length; i++)
      if (s.pellets[i] && left-- > 0) s.pellets[i] = false;
    s.player = { x: 12, y: 23, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    stepPacman(s, 0);
    expect(s.fruitSpawned).toBe(1);
    expect(s.fruitTime).toBe(9);
    s.score = 9995;
    ticks(s, 0.2);
    expect(s.lives).toBe(4);
    expect(s.extraLife).toBe(true);
    ticks(s, 1);
    expect(s.lives).toBe(4);
    s.pellets.fill(false);
    s.pellets[1 * COLS + 1] = true;
    s.pellets[1 * COLS + 2] = true;
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    stepPacman(s, 0);
    expect(s.fruitSpawned).toBe(2);
  });
  test('four chase targets differ and ghosts cannot turn into walls or reverse freely', () => {
    const s = playing();
    s.scatter = false;
    s.player.dir = 'RIGHT';
    expect(ghostTarget(s, 0)).toEqual({ x: 13, y: 23 });
    expect(ghostTarget(s, 1)).toEqual({ x: 17, y: 23 });
    expect(ghostTarget(s, 2)).toEqual({ x: 17, y: 32 });
    Object.assign(s.ghosts[3], { x: 13, y: 23, mode: 'active' });
    expect(ghostTarget(s, 3)).toEqual({ x: 0, y: 32 });
    Object.assign(s.ghosts[0], { x: 6, y: 5, dir: 'RIGHT', mode: 'active' });
    const dir = chooseGhostDirection(s, 0);
    expect(dir).not.toBe('LEFT');
    const n = neighbor(6, 5, dir);
    expect(walkable(n.x, n.y)).toBe(true);
  });
  test('validates snapshots including actors, timers, dot locations and phase', () => {
    const s = newPacman();
    expect(isPacmanState(s)).toBe(true);
    expect(isPacmanState({ ...s, pellets: [true] })).toBe(false);
    const bad = [...s.pellets];
    bad[0] = true;
    expect(isPacmanState({ ...s, pellets: bad })).toBe(false);
    expect(isPacmanState({ ...s, player: { ...s.player, x: 0, y: 0 } })).toBe(
      false,
    );
    expect(isPacmanState({ ...s, ghosts: [null] })).toBe(false);
    expect(isPacmanState({ ...s, ghosts: Array(4) })).toBe(false);
    const sparseDots = [...s.pellets];
    delete sparseDots[0];
    expect(isPacmanState({ ...s, pellets: sparseDots })).toBe(false);
    expect(isPacmanState({ ...s, score: 10000 })).toBe(false);
    expect(isPacmanState({ ...s, power: Infinity })).toBe(false);
    expect(isPacmanState({ ...s, phase: 'over' })).toBe(false);
  });
  test('fruit collection awards level points and fruit expires without collection', () => {
    const s = playing();
    s.player = { x: 13, y: 17, dir: 'RIGHT', progress: 0.5 };
    s.wanted = 'RIGHT';
    s.fruitTime = 9;
    expect(stepPacman(s, 1 / 120)).toContain('fruit');
    expect(s.score).toBe(100);
    expect(s.fruitTime).toBe(0);
    s.player = { x: 1, y: 1, dir: 'LEFT', progress: 0 };
    s.wanted = 'LEFT';
    s.fruitTime = 0.1;
    ticks(s, 0.2);
    expect(s.fruitTime).toBe(0);
  });
  test('long simulation keeps every actor and saved state valid', () => {
    const s = newPacman();
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    for (let i = 0; i < 18000 && s.phase !== 'over'; i++) {
      if (i % 120 === 0) s.wanted = DIRECTIONS[Math.floor(random() * 4)];
      stepPacman(s, 1 / 120, random);
      if (i % 60 === 0 && s.phase !== 'over')
        expect(isPacmanState(s)).toBe(true);
    }
  });
});
