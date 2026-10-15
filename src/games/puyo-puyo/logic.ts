export const COLS = 6;
export const ROWS = 13;
export const COLORS = 5;

export interface Pair {
  x: number;
  y: number;
  rotation: number;
  colors: [number, number];
}
export interface PuyoState {
  version: 1;
  board: number[];
  pair: Pair | null;
  next: [number, number];
  phase: 'falling' | 'settling' | 'clearing' | 'over';
  score: number;
  dropped: number;
  popped: number;
  chain: number;
  maxChain: number;
}

const OFFSETS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
] as const;
const CHAIN_POWER = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416,
  448, 480, 512,
];

export function pairCells(pair: Pair) {
  const [dx, dy] = OFFSETS[pair.rotation];
  return [
    { x: pair.x, y: pair.y, color: pair.colors[0] },
    { x: pair.x + dx, y: pair.y + dy, color: pair.colors[1] },
  ];
}
export function fits(board: number[], pair: Pair) {
  return pairCells(pair).every(
    ({ x, y }) =>
      x >= 0 && x < COLS && y >= 0 && y < ROWS && board[y * COLS + x] === 0,
  );
}
export function rotatePair(board: number[], pair: Pair, direction: 1 | -1) {
  const rotation = (pair.rotation + direction + 4) % 4;
  for (const [dx, dy] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
  ]) {
    const candidate = { ...pair, rotation, x: pair.x + dx, y: pair.y + dy };
    if (fits(board, candidate)) return candidate;
  }
  return pair;
}
export function landingPair(board: number[], pair: Pair) {
  const result = { ...pair };
  while (fits(board, { ...result, y: result.y + 1 })) result.y++;
  return result;
}
function randomColors(random: () => number): [number, number] {
  return [1 + Math.floor(random() * COLORS), 1 + Math.floor(random() * COLORS)];
}
function spawn(colors: [number, number]): Pair {
  return { x: 2, y: 1, rotation: 0, colors: [...colors] };
}
export function newPuyo(random = Math.random): PuyoState {
  return {
    version: 1,
    board: Array(COLS * ROWS).fill(0),
    pair: spawn(randomColors(random)),
    next: randomColors(random),
    phase: 'falling',
    score: 0,
    dropped: 0,
    popped: 0,
    chain: 0,
    maxChain: 0,
  };
}
export function fallDelay(dropped: number) {
  return Math.max(110, 760 - Math.floor(dropped / 12) * 55);
}
export function lockPair(state: PuyoState): PuyoState {
  if (state.phase !== 'falling' || !state.pair) return state;
  const board = [...state.board];
  for (const { x, y, color } of pairCells(state.pair))
    board[y * COLS + x] = color;
  return {
    ...state,
    board,
    pair: null,
    phase: 'settling',
    chain: 0,
    dropped: state.dropped + 1,
  };
}

// Each blob falls independently after the pair touches an uneven stack.
export function gravityStep(board: number[]) {
  const result = [...board];
  let moved = false;
  for (let y = ROWS - 2; y >= 0; y--) {
    for (let x = 0; x < COLS; x++) {
      const index = y * COLS + x;
      if (result[index] && !result[index + COLS]) {
        result[index + COLS] = result[index];
        result[index] = 0;
        moved = true;
      }
    }
  }
  return { board: result, moved };
}

export function clearGroups(board: number[]) {
  const seen = new Set<number>();
  const groups: number[][] = [];
  for (let start = COLS; start < board.length; start++) {
    if (!board[start] || seen.has(start)) continue;
    const group = [start];
    seen.add(start);
    for (let cursor = 0; cursor < group.length; cursor++) {
      const index = group[cursor];
      const x = index % COLS;
      const neighbors = [index - COLS, index + COLS];
      if (x > 0) neighbors.push(index - 1);
      if (x < COLS - 1) neighbors.push(index + 1);
      for (const neighbor of neighbors) {
        // The hidden entrance row cannot form a clearing group.
        if (
          neighbor < COLS ||
          neighbor >= board.length ||
          seen.has(neighbor) ||
          board[neighbor] !== board[start]
        )
          continue;
        seen.add(neighbor);
        group.push(neighbor);
      }
    }
    if (group.length >= 4) groups.push(group);
  }
  return groups;
}

export function advanceResolution(
  state: PuyoState,
  random = Math.random,
): PuyoState {
  if (state.phase === 'clearing') {
    const board = [...state.board];
    for (const index of clearGroups(board).flat()) board[index] = 0;
    return { ...state, board, phase: 'settling' };
  }
  if (state.phase !== 'settling') return state;
  const gravity = gravityStep(state.board);
  if (gravity.moved) return { ...state, board: gravity.board };
  const groups = clearGroups(state.board);
  if (groups.length) {
    const chain = state.chain + 1;
    const count = groups.reduce((sum, group) => sum + group.length, 0);
    const colors = new Set(groups.map((group) => state.board[group[0]])).size;
    const colorBonus = [0, 0, 3, 6, 12, 24][colors];
    const groupBonus = groups.reduce(
      (sum, group) =>
        sum +
        (group.length <= 4 ? 0 : group.length >= 11 ? 10 : group.length - 3),
      0,
    );
    const multiplier = Math.max(
      1,
      Math.min(999, CHAIN_POWER[Math.min(chain, 19)] + colorBonus + groupBonus),
    );
    return {
      ...state,
      phase: 'clearing',
      chain,
      maxChain: Math.max(state.maxChain, chain),
      popped: state.popped + count,
      score: state.score + count * 10 * multiplier,
    };
  }
  const pair = spawn(state.next);
  const over = !fits(state.board, pair);
  return {
    ...state,
    phase: over ? 'over' : 'falling',
    pair: over ? null : pair,
    next: randomColors(random),
    score:
      state.score +
      (state.chain > 0 && state.board.every((value) => value === 0) ? 1000 : 0),
  };
}

export function isPuyoState(value: unknown): value is PuyoState {
  if (!value || typeof value !== 'object') return false;
  const state = value as PuyoState;
  const color = (n: unknown): n is number =>
    typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= COLORS;
  const colors = (pair: unknown): pair is [number, number] =>
    Array.isArray(pair) && pair.length === 2 && pair.every(color);
  if (
    state.version !== 1 ||
    !Array.isArray(state.board) ||
    state.board.length !== COLS * ROWS ||
    !state.board.every((n) => n === 0 || color(n)) ||
    !colors(state.next) ||
    !['falling', 'settling', 'clearing'].includes(state.phase) ||
    ![
      state.score,
      state.dropped,
      state.popped,
      state.chain,
      state.maxChain,
    ].every((n) => Number.isSafeInteger(n) && n >= 0) ||
    state.chain > 19 ||
    state.maxChain > 19 ||
    state.chain > state.maxChain
  )
    return false;
  if (state.phase !== 'falling')
    return (
      state.pair === null &&
      (state.phase !== 'clearing' ||
        (state.chain > 0 && clearGroups(state.board).length > 0))
    );
  const pair = state.pair;
  return (
    !!pair &&
    colors(pair.colors) &&
    Number.isInteger(pair.x) &&
    Number.isInteger(pair.y) &&
    Number.isInteger(pair.rotation) &&
    pair.rotation >= 0 &&
    pair.rotation < 4 &&
    fits(state.board, pair)
  );
}
