import { describe, expect, test } from '@rstest/core';
import { games } from '../src/core/game-registry';
import {
  build,
  canBuild,
  isState,
  LEVELS,
  newGame,
  pathLength,
  pathPosition,
  sell,
  startWave,
  step,
  TOWERS,
  upgrade,
} from '../src/games/carrot-fantasy/logic';

function advance(s: ReturnType<typeof newGame>, seconds: number) {
  for (let i = 0; i < seconds * 40; i++) step(s, 0.025);
}
function emptyCell(s: ReturnType<typeof newGame>) {
  const cell = Array.from({ length: 96 }, (_, i) => i).find((i) =>
    canBuild(s, i),
  );
  if (cell === undefined) throw new Error('No building tile');
  return cell;
}
describe('Carrot Fantasy', () => {
  test('discovers the plugin and imports twelve original paths with distinct obstacle layouts', () => {
    expect(games.some((g) => g.id === 'carrot-fantasy')).toBe(true);
    expect(LEVELS).toHaveLength(12);
    for (let i = 0; i < 12; i++) {
      const s = newGame(i);
      expect(isState(s)).toBe(true);
      expect(pathLength(i)).toBeGreaterThan(400);
      expect(pathPosition(i, pathLength(i))).toEqual(
        LEVELS[i].path[LEVELS[i].path.length - 1],
      );
      expect(LEVELS[i].towers.every((kind) => kind in TOWERS)).toBe(true);
      for (const p of LEVELS[i].path)
        expect(
          canBuild(s, Math.floor(p.y / 80) * 12 + Math.floor(p.x / 80)),
        ).toBe(false);
    }
  });
  test('charges construction and upgrades, disallows occupied cells and refunds a sale once', () => {
    const s = newGame(),
      cell = emptyCell(s),
      gold = s.gold;
    expect(build(s, cell, 'Bottle')).toBe(true);
    expect(s.gold).toBe(gold - 100);
    expect(build(s, cell, 'Bottle')).toBe(false);
    expect(build(s, cell + 1, 'Star')).toBe(false);
    const id = s.towers[0].id;
    expect(upgrade(s, id)).toBe(true);
    expect(s.towers[0].level).toBe(2);
    expect(upgrade(s, id)).toBe(false);
    s.gold = 1000;
    expect(upgrade(s, id)).toBe(true);
    expect(upgrade(s, id)).toBe(false);
    expect(sell(s, id)).toBe(true);
    expect(s.gold).toBe(1172);
    expect(sell(s, id)).toBe(false);
    expect(canBuild(s, cell)).toBe(true);
  });
  test('targeting and destroying an obstacle frees its occupied tiles and awards gold', () => {
    const s = newGame(),
      o = s.obstacles[0];
    s.gold = 10000;
    const cell = Array.from({ length: 96 }, (_, i) => i)
      .filter((i) => canBuild(s, i))
      .sort(
        (a, b) =>
          Math.hypot(
            (a % 12) * 80 + 40 - o.x,
            Math.floor(a / 12) * 80 + 40 - o.y,
          ) -
          Math.hypot(
            (b % 12) * 80 + 40 - o.x,
            Math.floor(b / 12) * 80 + 40 - o.y,
          ),
      )[0];
    build(s, cell, 'Bottle');
    upgrade(s, s.towers[0].id);
    upgrade(s, s.towers[0].id);
    const gold = s.gold;
    s.target = { type: 'obstacle', id: o.id };
    advance(s, 10);
    expect(s.obstacles.some((v) => v.id === o.id)).toBe(false);
    expect(s.gold).toBe(gold + o.reward);
    expect(s.target).toBeNull();
    expect(o.cells.some((cell) => canBuild(s, cell))).toBe(true);
    expect(isState(s)).toBe(true);
  });
  test('does not spawn during preparation, starts waves, and loses health when enemies reach the carrot', () => {
    const s = newGame();
    advance(s, 5);
    expect(s.enemies).toHaveLength(0);
    expect(startWave(s)).toBe(true);
    expect(startWave(s)).toBe(false);
    advance(s, 1);
    expect(s.enemies).toHaveLength(1);
    expect(isState(s)).toBe(true);
    advance(s, 200);
    expect(s.phase).toBe('lost');
    expect(s.health).toBe(0);
    expect(isState(s)).toBe(true);
  });
  test('slow projectiles slow a monster and preserve the effect in a restored snapshot', () => {
    const s = newGame();
    s.phase = 'running';
    s.wave = 1;
    s.spawned = 10;
    const p = LEVELS[0].path[0];
    s.enemies = [
      {
        ...p,
        id: 100,
        kind: 'land_star',
        hp: 1000,
        maxHp: 1000,
        speed: 80,
        reward: 14,
        attack: 1,
        distance: 0,
        slow: 0,
      },
    ];
    s.shots = [
      {
        ...p,
        id: 101,
        fromX: p.x,
        fromY: p.y,
        kind: 'Shit',
        level: 1,
        target: { type: 'enemy', id: 100 },
        damage: 10,
        speed: 220,
      },
    ];
    s.nextId = 102;
    step(s, 0.025);
    expect(s.enemies[0].slow).toBeGreaterThan(0);
    expect(s.enemies[0].hp).toBe(990);
    expect(isState(JSON.parse(JSON.stringify(s)))).toBe(true);
  });
  test('all final-wave enemies must be cleared before a win; health badges survive starting another level', () => {
    const s = newGame();
    s.phase = 'running';
    s.wave = LEVELS[0].waves;
    s.spawned = 9;
    s.timer = 1;
    step(s, 0.025);
    expect(s.phase).toBe('running');
    s.spawned = 10;
    step(s, 0.025);
    expect(s.phase).toBe('won');
    expect(s.best[0]).toBe(10);
    expect(newGame(1, s.best).best[0]).toBe(10);
  });
  test('star explosions hit nearby enemies and fan shots pierce the same line', () => {
    for (const kind of ['Star', 'Fan'] as const) {
      const s = newGame();
      s.phase = 'running';
      s.wave = 1;
      s.spawned = 10;
      const p = LEVELS[0].path[0];
      s.enemies = [0, 40].map((travel, i) => ({
        ...pathPosition(0, travel),
        id: 100 + i,
        kind: 'land_star',
        hp: 100,
        maxHp: 100,
        speed: 0,
        reward: 14,
        attack: 1,
        distance: travel,
        slow: 0,
      }));
      s.shots = [
        {
          ...p,
          id: 102,
          fromX: p.x,
          fromY: p.y - 60,
          kind,
          level: 1,
          target: { type: 'enemy', id: 100 },
          damage: 20,
          speed: 200,
        },
      ];
      s.nextId = 103;
      step(s, 0.025);
      expect(s.enemies[0].hp).toBe(80);
      expect(s.enemies[1].hp).toBeLessThan(100);
      expect(isState(s)).toBe(true);
    }
  });
  test('magic ball chains to nearby monsters and keeps distant monsters intact', () => {
    const s = newGame();
    s.phase = 'running';
    s.wave = 1;
    s.spawned = 10;
    const p = LEVELS[0].path[0];
    s.enemies = [0, 40, 150].map((travel, i) => ({
      ...pathPosition(0, travel),
      id: 100 + i,
      kind: 'land_star',
      hp: 100,
      maxHp: 100,
      speed: 0,
      reward: 14,
      attack: 1,
      distance: travel,
      slow: 0,
    }));
    s.shots = [
      {
        ...p,
        id: 103,
        fromX: p.x,
        fromY: p.y - 60,
        kind: 'Ball',
        level: 1,
        target: { type: 'enemy', id: 100 },
        damage: 20,
        speed: 500,
      },
    ];
    s.nextId = 104;
    step(s, 0.025);
    expect(s.enemies.map((e) => e.hp)).toEqual([80, 88, 100]);
  });
  test('rejects damaged or incompatible saved games', () => {
    expect(isState({})).toBe(false);
    expect(isState({ ...newGame(), gold: NaN })).toBe(false);
    expect(isState({ ...newGame(), level: 99 })).toBe(false);
    expect(
      isState({
        ...newGame(),
        obstacles: [{ ...newGame().obstacles[0], cells: [99] }],
      }),
    ).toBe(false);
    expect(isState({ ...newGame(), shots: [{ kind: 'unknown' }] })).toBe(false);
  });
});
