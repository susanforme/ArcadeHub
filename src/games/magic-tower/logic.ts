import type { Direction } from '../../core/types';
import {
  ENTRY,
  type Enemy,
  EXIT,
  enemyFor,
  FLOOR_COUNT,
  floors,
  SIZE,
  TOKENS,
} from './levels';

export interface Progress {
  floor: number;
  player: number;
  hp: number;
  attack: number;
  defense: number;
  gold: number;
  keys: [number, number, number];
  maps: string[][];
  kills: number;
  won: boolean;
}
export interface TowerState extends Progress {
  version: 1;
  history: Progress[];
  checkpoint: Progress;
}
export type Outcome =
  | 'move'
  | 'wall'
  | 'key'
  | 'danger'
  | 'battle'
  | 'item'
  | 'stairs'
  | 'shop'
  | 'win';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
function progress(state: Progress): Progress {
  const { floor, player, hp, attack, defense, gold, keys, maps, kills, won } =
    state;
  return clone({
    floor,
    player,
    hp,
    attack,
    defense,
    gold,
    keys,
    maps,
    kills,
    won,
  });
}
export function newTower(): TowerState {
  const initial: Progress = {
    floor: 0,
    player: ENTRY,
    hp: 350,
    attack: 18,
    defense: 8,
    gold: 0,
    keys: [0, 0, 0],
    maps: clone(floors),
    kills: 0,
    won: false,
  };
  return { ...initial, version: 1, history: [], checkpoint: progress(initial) };
}
export function damageFor(
  hero: Pick<Progress, 'attack' | 'defense'>,
  enemy: Enemy,
) {
  const hit = hero.attack - enemy.defense;
  return hit <= 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, Math.ceil(enemy.hp / hit) - 1) *
        Math.max(0, enemy.attack - hero.defense);
}
export function neighbor(cell: number, direction: Direction) {
  const next = cell + { LEFT: -1, RIGHT: 1, UP: -SIZE, DOWN: SIZE }[direction];
  if (
    next < 0 ||
    next >= SIZE * SIZE ||
    ((direction === 'LEFT' || direction === 'RIGHT') &&
      Math.floor(next / SIZE) !== Math.floor(cell / SIZE))
  )
    return -1;
  return next;
}
function remember(state: TowerState): TowerState {
  return {
    ...progress(state),
    version: 1,
    history: [...state.history.slice(-127), progress(state)],
    checkpoint: state.checkpoint,
  };
}
export function moveTower(
  state: TowerState,
  direction: Direction,
): { state: TowerState; outcome: Outcome } {
  if (state.won) return { state, outcome: 'win' };
  const next = neighbor(state.player, direction);
  const token = state.maps[state.floor][next];
  if (!token || token === '#' || (token === '<' && state.floor === 0))
    return { state, outcome: 'wall' };
  const door = 'YBR'.indexOf(token);
  if (door >= 0 && state.keys[door] === 0) return { state, outcome: 'key' };
  const enemy =
    token === 'm' || token === 'G'
      ? enemyFor(state.floor, token === 'G')
      : null;
  const damage = enemy ? damageFor(state, enemy) : 0;
  if (damage >= state.hp) return { state, outcome: 'danger' };
  if (token === 's') return { state, outcome: 'shop' };
  const result = remember(state);
  result.player = next;
  let outcome: Outcome = 'move';
  if (door >= 0) {
    result.keys[door]--;
    result.maps[state.floor][next] = '.';
  }
  const key = 'ybr'.indexOf(token);
  if (key >= 0) {
    result.keys[key]++;
    outcome = 'item';
  }
  if (token === 'a') {
    result.attack += 3;
    outcome = 'item';
  }
  if (token === 'd') {
    result.defense += 2;
    outcome = 'item';
  }
  if (token === 'p') {
    result.hp += 120 + state.floor * 15;
    outcome = 'item';
  }
  if (enemy) {
    result.hp -= damage;
    result.gold += enemy.gold;
    result.kills++;
    outcome = 'battle';
  }
  if (key >= 0 || 'adpmG'.includes(token)) result.maps[state.floor][next] = '.';
  if (token === '>') {
    if (state.floor === FLOOR_COUNT - 1) {
      result.won = true;
      outcome = 'win';
    } else {
      result.floor++;
      result.player = ENTRY;
      outcome = 'stairs';
    }
  }
  if (token === '<') {
    result.floor--;
    result.player = EXIT;
    outcome = 'stairs';
  }
  if (outcome === 'stairs') {
    result.checkpoint = progress(result);
    result.history = [];
  }
  return { state: result, outcome };
}
export function undoTower(state: TowerState): TowerState {
  const previous = state.history[state.history.length - 1];
  return previous
    ? {
        ...clone(previous),
        version: 1,
        history: state.history.slice(0, -1),
        checkpoint: state.checkpoint,
      }
    : state;
}
export function retryFloor(state: TowerState): TowerState {
  return {
    ...clone(state.checkpoint),
    version: 1,
    history: [],
    checkpoint: clone(state.checkpoint),
  };
}
export function buyUpgrade(
  state: TowerState,
  kind: 'attack' | 'defense' | 'hp',
): TowerState {
  const nearShop = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as const).some(
    (d) => state.maps[state.floor][neighbor(state.player, d)] === 's',
  );
  const price = 20 + state.floor * 5;
  if (state.won || !nearShop || state.gold < price) return state;
  const result = remember(state);
  result.gold -= price;
  result[kind] += kind === 'hp' ? 200 : kind === 'attack' ? 3 : 2;
  return result;
}
function validProgress(value: unknown): value is Progress {
  if (!value || typeof value !== 'object') return false;
  const p = value as Progress;
  if (
    ![p.floor, p.player, p.hp, p.attack, p.defense, p.gold, p.kills].every(
      (n) => Number.isSafeInteger(n) && n >= 0 && n <= 10000000,
    ) ||
    p.floor >= FLOOR_COUNT ||
    p.player >= SIZE * SIZE ||
    p.hp <= 0 ||
    p.attack <= 0 ||
    typeof p.won !== 'boolean'
  )
    return false;
  if (
    !Array.isArray(p.keys) ||
    p.keys.length !== 3 ||
    !p.keys.every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 1000)
  )
    return false;
  if (
    !Array.isArray(p.maps) ||
    p.maps.length !== FLOOR_COUNT ||
    !p.maps.every(
      (m, f) =>
        Array.isArray(m) &&
        m.length === SIZE * SIZE &&
        m.every(
          (v, i) =>
            typeof v === 'string' &&
            v.length === 1 &&
            TOKENS.includes(v) &&
            (v === floors[f][i] ||
              (v === '.' && !'#<>s'.includes(floors[f][i]))),
        ),
    )
  )
    return false;
  return (
    '.<>'.includes(p.maps[p.floor][p.player]) &&
    (!p.won || (p.floor === FLOOR_COUNT - 1 && p.player === EXIT))
  );
}
export function isTowerState(value: unknown): value is TowerState {
  if (!validProgress(value)) return false;
  const state = value as TowerState;
  return (
    state.version === 1 &&
    validProgress(state.checkpoint) &&
    Array.isArray(state.history) &&
    state.history.length <= 128 &&
    state.history.every(validProgress)
  );
}
