export const SIZE = 9;
export const COLORS = 7;

export interface LinesState {
  version: 1;
  board: number[];
  next: number[];
  score: number;
  moves: number;
  over: boolean;
}

function color(random: () => number) {
  return 1 + Math.floor(random() * COLORS);
}

export function newLines(random = Math.random): LinesState {
  const board = Array<number>(SIZE * SIZE).fill(0);
  const added = addBalls(
    board,
    Array.from({ length: 5 }, () => color(random)),
    random,
  );
  if (matchingBalls(board).length) {
    const last = added[added.length - 1];
    board[last] = (board[last] % COLORS) + 1;
  }
  return {
    version: 1,
    board,
    next: Array.from({ length: 3 }, () => color(random)),
    score: 0,
    moves: 0,
    over: false,
  };
}

export function findPath(board: number[], from: number, to: number): number[] {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= SIZE * SIZE ||
    to >= SIZE * SIZE ||
    !board[from] ||
    board[to]
  )
    return [];
  const previous = Array<number>(SIZE * SIZE).fill(-1);
  previous[from] = from;
  const queue = [from];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    const x = index % SIZE;
    const y = Math.floor(index / SIZE);
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= SIZE || ny < 0 || ny >= SIZE) continue;
      const next = ny * SIZE + nx;
      if (board[next] || previous[next] !== -1) continue;
      previous[next] = index;
      if (next === to) {
        const path = [to];
        while (path[path.length - 1] !== from)
          path.push(previous[path[path.length - 1]]);
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return [];
}

export function matchingBalls(board: number[]): number[] {
  const matched = new Set<number>();
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const value = board[y * SIZE + x];
      if (!value) continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
        [1, 1],
        [-1, 1],
      ]) {
        const px = x - dx;
        const py = y - dy;
        if (px >= 0 && px < SIZE && py >= 0 && board[py * SIZE + px] === value)
          continue;
        const line: number[] = [];
        let nx = x;
        let ny = y;
        while (
          nx >= 0 &&
          nx < SIZE &&
          ny < SIZE &&
          board[ny * SIZE + nx] === value
        ) {
          line.push(ny * SIZE + nx);
          nx += dx;
          ny += dy;
        }
        if (line.length >= 5) for (const index of line) matched.add(index);
      }
    }
  }
  return [...matched];
}

function addBalls(board: number[], colors: number[], random: () => number) {
  const empty = board.flatMap((value, index) => (value ? [] : [index]));
  const spawned: number[] = [];
  for (const value of colors) {
    if (!empty.length) break;
    const [index] = empty.splice(Math.floor(random() * empty.length), 1);
    board[index] = value;
    spawned.push(index);
  }
  return spawned;
}

export function moveBall(
  state: LinesState,
  from: number,
  to: number,
  random = Math.random,
) {
  const path = state.over ? [] : findPath(state.board, from, to);
  if (!path.length)
    return { state, path, cleared: [] as number[], spawned: [] as number[] };
  const board = [...state.board];
  board[to] = board[from];
  board[from] = 0;
  let cleared = matchingBalls(board);
  let spawned: number[] = [];
  let next = state.next;
  if (!cleared.length) {
    spawned = addBalls(board, state.next, random);
    next = Array.from({ length: 3 }, () => color(random));
    cleared = matchingBalls(board);
  }
  for (const index of cleared) board[index] = 0;
  return {
    state: {
      ...state,
      board,
      next,
      // Classic visible-preview scoring: two points per removed ball.
      score: state.score + 2 * cleared.length,
      moves: state.moves + 1,
      over: board.every(Boolean),
    },
    path,
    cleared,
    spawned,
  };
}

export function isLinesState(value: unknown): value is LinesState {
  if (!value || typeof value !== 'object') return false;
  const s = value as LinesState;
  return (
    s.version === 1 &&
    Array.isArray(s.board) &&
    s.board.length === SIZE * SIZE &&
    s.board.every((n) => Number.isInteger(n) && n >= 0 && n <= COLORS) &&
    Array.isArray(s.next) &&
    s.next.length === 3 &&
    s.next.every((n) => Number.isInteger(n) && n >= 1 && n <= COLORS) &&
    Number.isSafeInteger(s.score) &&
    s.score >= 0 &&
    Number.isSafeInteger(s.moves) &&
    s.moves >= 0 &&
    typeof s.over === 'boolean' &&
    s.over === s.board.every(Boolean)
  );
}
