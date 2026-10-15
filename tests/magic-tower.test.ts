import { describe, expect, test } from '@rstest/core';
import type { Direction } from '../src/core/types';
import {
  ENTRY,
  enemyFor,
  FLOOR_COUNT,
  floors,
  SIZE,
} from '../src/games/magic-tower/levels';
import {
  buyUpgrade,
  damageFor,
  isTowerState,
  moveTower,
  neighbor,
  newTower,
  retryFloor,
  type TowerState,
  undoTower,
} from '../src/games/magic-tower/logic';

const directions: Direction[] = ['UP', 'RIGHT', 'DOWN', 'LEFT'];
function nextRoute(state: TowerState): Direction[] {
  const seen = new Set([state.player]);
  const queue: { cell: number; path: Direction[] }[] = [
    { cell: state.player, path: [] },
  ];
  const choices: { path: Direction[]; rank: number }[] = [];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const dir of directions) {
      const cell = neighbor(current.cell, dir);
      const tile = state.maps[state.floor][cell];
      if (cell < 0 || seen.has(cell) || '#<s'.includes(tile)) continue;
      seen.add(cell);
      const path = [...current.path, dir];
      if (tile === '.') queue.push({ cell, path });
      else {
        const door = 'YBR'.indexOf(tile);
        if (door >= 0 && !state.keys[door]) continue;
        const damage = 'mG'.includes(tile)
          ? damageFor(state, enemyFor(state.floor, tile === 'G'))
          : 0;
        if (damage >= state.hp) continue;
        choices.push({
          path,
          rank:
            tile === '>'
              ? 100000
              : 'mG'.includes(tile)
                ? 500 + damage
                : door >= 0
                  ? 200
                  : path.length,
        });
      }
    }
  }
  return choices.sort((a, b) => a.rank - b.rank)[0]?.path ?? [];
}
describe('Magic Tower', () => {
  test('classic damage has no retaliation after a killing blow', () => {
    expect(
      damageFor(
        { attack: 15, defense: 5 },
        { hp: 20, attack: 10, defense: 5, gold: 0, frame: 0 },
      ),
    ).toBe(5);
    expect(
      damageFor(
        { attack: 25, defense: 5 },
        { hp: 20, attack: 10, defense: 5, gold: 0, frame: 0 },
      ),
    ).toBe(0);
    expect(
      damageFor(
        { attack: 5, defense: 5 },
        { hp: 20, attack: 10, defense: 5, gold: 0, frame: 0 },
      ),
    ).toBe(Infinity);
  });
  test('colored doors consume exactly one matching key and undo restores it', () => {
    let state = newTower();
    state.player = SIZE + 4;
    expect(moveTower(state, 'RIGHT').outcome).toBe('key');
    state.keys = [1, 2, 3];
    state = moveTower(state, 'RIGHT').state;
    expect(state.keys).toEqual([0, 2, 3]);
    expect(state.maps[0][SIZE + 5]).toBe('.');
    state = undoTower(state);
    expect(state.keys).toEqual([1, 2, 3]);
    expect(state.maps[0][SIZE + 5]).toBe('Y');
  });
  test('fatal battles do not mutate the hero or remove the enemy', () => {
    const state = newTower();
    state.player = 9 * SIZE + 4;
    state.hp = 1;
    expect(moveTower(state, 'RIGHT')).toEqual({ state, outcome: 'danger' });
    expect(state.maps[0][9 * SIZE + 5]).toBe('m');
  });
  test('floor retry returns items and position to its entry checkpoint', () => {
    let state = newTower();
    state = moveTower(moveTower(state, 'RIGHT').state, 'RIGHT').state;
    expect(state.keys[0]).toBe(1);
    expect(retryFloor(state)).toEqual(newTower());
  });
  test('shop purchases require proximity and sufficient gold, and are undoable', () => {
    const state = newTower();
    state.gold = 40;
    expect(buyUpgrade(state, 'attack')).toBe(state);
    state.player = 8 * SIZE + 1;
    const result = buyUpgrade(state, 'attack');
    expect(result.attack).toBe(21);
    expect(result.gold).toBe(20);
    expect(undoTower(result).attack).toBe(18);
  });
  test('all twelve floors can be cleared through public movement without cheats or shops', () => {
    let state = newTower();
    for (let turn = 0; turn < 500 && !state.won; turn++) {
      const path = nextRoute(state);
      expect(
        path.length,
        `stuck on floor ${state.floor + 1}, HP ${state.hp}`,
      ).toBeGreaterThan(0);
      for (const dir of path) state = moveTower(state, dir).state;
      expect(isTowerState(state)).toBe(true);
    }
    expect(state.won).toBe(true);
    expect(state.floor).toBe(FLOOR_COUNT - 1);
    expect(state.hp).toBeGreaterThan(0);
  });
  test('saved progress survives JSON and rejects malformed nested maps and history', () => {
    const state = moveTower(newTower(), 'RIGHT').state;
    expect(isTowerState(JSON.parse(JSON.stringify(state)))).toBe(true);
    expect(isTowerState({ ...state, player: 0 })).toBe(false);
    expect(isTowerState({ ...state, history: [null] })).toBe(false);
    expect(
      isTowerState({ ...state, checkpoint: { ...state.checkpoint, hp: NaN } }),
    ).toBe(false);
    expect(isTowerState({ ...state, keys: [1.2, 0, 0] })).toBe(false);
    expect(
      isTowerState({ ...state, maps: floors.map(() => Array(121).fill('.')) }),
    ).toBe(false);
    expect(state.checkpoint.player).toBe(ENTRY);
  });
});
