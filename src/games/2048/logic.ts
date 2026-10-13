import type { Action } from '../../core/types';

export type Direction = Extract<Action, 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>;
export interface GridState {
  version: 1;
  board: number[];
  score: number;
  won: boolean;
  keepPlaying: boolean;
  over: boolean;
}
export interface Motion {
  from: number;
  to: number;
  value: number;
}
export interface MoveResult {
  state: GridState;
  moved: boolean;
  motions: Motion[];
  merged: number[];
  spawned: number | null;
}
export function spawnTile(board: number[], random = Math.random) {
  const empty = board
    .map((value, index) => (value === 0 ? index : -1))
    .filter((index) => index >= 0);
  if (!empty.length) return { board, index: null };
  const value = random() < 0.9 ? 2 : 4;
  const index =
    empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const next = [...board];
  next[index] = value;
  return { board: next, index };
}
export function newGrid(random = Math.random): GridState {
  const board = spawnTile(
    spawnTile(Array(16).fill(0), random).board,
    random,
  ).board;
  return {
    version: 1,
    board,
    score: 0,
    won: false,
    keepPlaying: false,
    over: false,
  };
}
export function movesAvailable(board: number[]) {
  return board.some(
    (value, index) =>
      value === 0 ||
      (index % 4 < 3 && board[index + 1] === value) ||
      (index < 12 && board[index + 4] === value),
  );
}
export function moveGrid(
  state: GridState,
  direction: Direction,
  random = Math.random,
): MoveResult {
  const unchanged = {
    state,
    moved: false,
    motions: [],
    merged: [],
    spawned: null,
  };
  if (state.over || (state.won && !state.keepPlaying)) return unchanged;
  const board = Array<number>(16).fill(0),
    motions: Motion[] = [],
    merged: number[] = [];
  let gained = 0;
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, i) =>
      direction === 'LEFT' || direction === 'RIGHT'
        ? line * 4 + i
        : i * 4 + line,
    );
    if (direction === 'RIGHT' || direction === 'DOWN') indices.reverse();
    const values = indices.filter((index) => state.board[index] !== 0);
    let destination = 0;
    for (let i = 0; i < values.length; i++) {
      const from = values[i],
        to = indices[destination++],
        value = state.board[from];
      motions.push({ from, to, value });
      if (i + 1 < values.length && state.board[values[i + 1]] === value) {
        motions.push({ from: values[++i], to, value });
        board[to] = value * 2;
        gained += value * 2;
        merged.push(to);
      } else board[to] = value;
    }
  }
  if (!merged.length && !motions.some((motion) => motion.from !== motion.to))
    return unchanged;
  const spawned = spawnTile(board, random);
  const next = {
    ...state,
    board: spawned.board,
    score: state.score + gained,
    won: state.won || board.some((value) => value >= 2048),
    over: !movesAvailable(spawned.board),
  };
  return { state: next, moved: true, motions, merged, spawned: spawned.index };
}
export function continueGrid(state: GridState): GridState {
  return state.won ? { ...state, keepPlaying: true } : state;
}
export function isGridState(value: unknown): value is GridState {
  if (!value || typeof value !== 'object') return false;
  const state = value as GridState;
  return (
    state.version === 1 &&
    Array.isArray(state.board) &&
    state.board.length === 16 &&
    state.board.every(
      (tile) =>
        tile === 0 ||
        (Number.isSafeInteger(tile) &&
          tile >= 2 &&
          Number.isInteger(Math.log2(tile))),
    ) &&
    state.board.filter(Boolean).length >= 2 &&
    Number.isSafeInteger(state.score) &&
    state.score >= 0 &&
    typeof state.won === 'boolean' &&
    state.won === state.board.some((tile) => tile >= 2048) &&
    typeof state.keepPlaying === 'boolean' &&
    (!state.keepPlaying || state.won) &&
    state.over === false &&
    movesAvailable(state.board)
  );
}
