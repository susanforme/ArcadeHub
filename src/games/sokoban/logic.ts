import type { Direction } from '../../core/types';
import { type Level, levels } from './levels';

export interface Position {
  player: number;
  boxes: number[];
  moves: number;
  pushes: number;
}
export interface SokobanState extends Position {
  version: 2;
  level: number;
  levelId: string;
  completed: string[];
  history: Position[];
}

export function newSokoban(level = 0, completed: string[] = []): SokobanState {
  const map = levels[level];
  if (!map) throw new Error('Unknown Sokoban level');
  return {
    version: 2,
    level,
    levelId: map.id,
    completed: [...completed],
    player: map.player,
    boxes: [...map.boxes],
    moves: 0,
    pushes: 0,
    history: [],
  };
}

export function neighbor(map: Level, cell: number, direction: Direction) {
  const offset = { LEFT: -1, RIGHT: 1, UP: -map.width, DOWN: map.width }[
    direction
  ];
  const next = cell + offset;
  if (
    (direction === 'LEFT' || direction === 'RIGHT') &&
    Math.floor(cell / map.width) !== Math.floor(next / map.width)
  )
    return -1;
  return map.floor.includes(next) ? next : -1;
}

export function solved(state: Position, map: Level) {
  return state.boxes.every((box) => map.goals.includes(box));
}

export function moveSokoban(
  state: SokobanState,
  direction: Direction,
  map = levels[state.level],
) {
  if (solved(state, map)) return state;
  const player = neighbor(map, state.player, direction);
  if (player < 0) return state;
  const box = state.boxes.indexOf(player);
  const target = box < 0 ? -1 : neighbor(map, player, direction);
  if (box >= 0 && (target < 0 || state.boxes.includes(target))) return state;
  const boxes = [...state.boxes];
  if (box >= 0) boxes[box] = target;
  const completed = solved(
    { player, boxes, moves: state.moves + 1, pushes: state.pushes },
    map,
  );
  return {
    ...state,
    completed:
      completed && !state.completed.includes(state.levelId)
        ? [...state.completed, state.levelId]
        : state.completed,
    player,
    boxes,
    moves: state.moves + 1,
    pushes: state.pushes + Number(box >= 0),
    history: [
      ...state.history,
      {
        player: state.player,
        boxes: state.boxes,
        moves: state.moves,
        pushes: state.pushes,
      },
    ],
  };
}

export function undoSokoban(state: SokobanState): SokobanState {
  const previous = state.history[state.history.length - 1];
  return previous
    ? { ...state, ...previous, history: state.history.slice(0, -1) }
    : state;
}

export function nextLevel(state: SokobanState) {
  return solved(state, levels[state.level]) && state.level + 1 < levels.length
    ? newSokoban(state.level + 1, state.completed)
    : state;
}

export function scoreFor(state: SokobanState) {
  return state.completed.length * 100;
}

// A corner is a certain dead end; other stuck layouts can still be undone/reset.
export function cornered(state: Position, map: Level) {
  return state.boxes.some(
    (box) =>
      !map.goals.includes(box) &&
      (neighbor(map, box, 'LEFT') < 0 || neighbor(map, box, 'RIGHT') < 0) &&
      (neighbor(map, box, 'UP') < 0 || neighbor(map, box, 'DOWN') < 0),
  );
}

export function isSokobanState(value: unknown): value is SokobanState {
  if (!value || typeof value !== 'object') return false;
  const state = value as SokobanState;
  if (state.version !== 2 || !Number.isInteger(state.level)) return false;
  const map = levels[state.level];
  if (
    !map ||
    state.levelId !== map.id ||
    !Array.isArray(state.history) ||
    !Array.isArray(state.completed) ||
    new Set(state.completed).size !== state.completed.length ||
    !state.completed.every((id) => levels.some((level) => level.id === id))
  )
    return false;
  const validPosition = (position: Position) =>
    position &&
    Number.isInteger(position.player) &&
    map.floor.includes(position.player) &&
    Array.isArray(position.boxes) &&
    position.boxes.length === map.boxes.length &&
    position.boxes.every(
      (box) => Number.isInteger(box) && map.floor.includes(box),
    ) &&
    new Set(position.boxes).size === position.boxes.length &&
    !position.boxes.includes(position.player) &&
    Number.isSafeInteger(position.moves) &&
    position.moves >= 0 &&
    Number.isSafeInteger(position.pushes) &&
    position.pushes >= 0 &&
    position.pushes <= position.moves;
  return (
    validPosition(state) &&
    state.history.length === state.moves &&
    state.history.every(
      (position, index) => validPosition(position) && position.moves === index,
    )
  );
}
