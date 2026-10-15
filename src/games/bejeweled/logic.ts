export const SIZE = 8;
export const COLORS = 7;
export const CUBE = 15;
// 1–7: ordinary gems; 8–14: same colors with a flame; 15: hypercube.
export const colorOf = (gem: number) =>
  gem > 0 && gem < CUBE ? ((gem - 1) % COLORS) + 1 : 0;
export const isFlame = (gem: number) => gem > COLORS && gem < CUBE;
export const levelFor = (score: number) =>
  Math.floor(Math.sqrt(score / 1000)) + 1;
export const levelGoal = (level: number) => 1000 * level * level;
export interface JewelState {
  version: 1;
  board: number[];
  score: number;
  moves: number;
}
export interface ClearResult {
  board: number[];
  removed: number[];
  created: number[];
}
const validIndex = (index: number) =>
  Number.isInteger(index) && index >= 0 && index < SIZE * SIZE;
export const adjacent = (a: number, b: number) =>
  validIndex(a) &&
  validIndex(b) &&
  Math.abs((a % SIZE) - (b % SIZE)) +
    Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE)) ===
    1;

export function findMatches(board: number[]): number[][] {
  const lines: number[][] = [];
  for (let axis = 0; axis < 2; axis++) {
    for (let row = 0; row < SIZE; row++) {
      let run: number[] = [];
      for (let col = 0; col <= SIZE; col++) {
        const index = axis === 0 ? row * SIZE + col : col * SIZE + row;
        const color = col < SIZE ? colorOf(board[index]) : 0;
        if (!color || (run.length && color !== colorOf(board[run[0]]))) {
          if (run.length >= 3) lines.push(run);
          run = [];
        }
        if (color) run.push(index);
      }
    }
  }
  return lines;
}

function explode(
  board: number[],
  initial: number[],
  created = new Map<number, number>(),
): ClearResult {
  const removed = new Set(initial);
  // Set iteration also visits newly added gems, propagating special-gem chains.
  for (const index of removed) {
    if (created.has(index)) continue;
    if (isFlame(board[index])) {
      const x = index % SIZE;
      const y = Math.floor(index / SIZE);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= SIZE || y + dy < 0 || y + dy >= SIZE)
            continue;
          removed.add((y + dy) * SIZE + x + dx);
        }
    } else if (board[index] === CUBE) {
      // An explosion hitting a cube clears the most common board color.
      const counts = Array(COLORS + 1).fill(0) as number[];
      for (const gem of board) counts[colorOf(gem)]++;
      let color = 1;
      for (let i = 2; i <= COLORS; i++)
        if (counts[i] > counts[color]) color = i;
      board.forEach((gem, i) => {
        if (colorOf(gem) === color) removed.add(i);
      });
    }
  }
  const result = [...board];
  for (const index of removed) result[index] = 0;
  for (const [index, gem] of created) {
    removed.delete(index);
    result[index] = gem;
  }
  return {
    board: result,
    removed: [...removed],
    created: [...created.keys()],
  };
}

export function clearMatches(
  board: number[],
  preferred: number[] = [],
): ClearResult | null {
  const lines = findMatches(board);
  if (!lines.length) return null;
  const groups: { cells: Set<number>; longest: number }[] = [];
  for (const line of lines) {
    const cells = new Set(line);
    let longest = line.length;
    for (let i = groups.length - 1; i >= 0; i--) {
      if (![...groups[i].cells].some((index) => cells.has(index))) continue;
      for (const index of groups[i].cells) cells.add(index);
      longest = Math.max(longest, groups[i].longest);
      groups.splice(i, 1);
    }
    groups.push({ cells, longest });
  }
  const created = new Map<number, number>();
  for (const { cells, longest } of groups) {
    if (cells.size < 4) continue;
    const candidates = [...preferred, ...cells];
    const index = candidates.find(
      (i) => cells.has(i) && board[i] > 0 && board[i] <= COLORS,
    );
    if (index !== undefined)
      created.set(index, longest >= 5 ? CUBE : colorOf(board[index]) + COLORS);
  }
  return explode(board, [...new Set(lines.flat())], created);
}

export function swapGems(board: number[], first: number, second: number) {
  if (!adjacent(first, second)) return null;
  const swapped = [...board];
  [swapped[first], swapped[second]] = [swapped[second], swapped[first]];
  let clear: ClearResult | null;
  if (swapped[first] === CUBE || swapped[second] === CUBE) {
    const color = colorOf(
      swapped[first] === CUBE ? swapped[second] : swapped[first],
    );
    const targets = swapped.flatMap((gem, index) =>
      !color || colorOf(gem) === color || index === first || index === second
        ? [index]
        : [],
    );
    // The swapped cube already has its explicit target color.
    const detonating = swapped.map((gem, index) =>
      (index === first || index === second) && gem === CUBE ? 0 : gem,
    );
    clear = explode(detonating, targets);
  } else clear = clearMatches(swapped, [second, first]);
  return clear ? { swapped, clear } : null;
}

export function findMove(board: number[]): [number, number] | null {
  for (let i = 0; i < SIZE * SIZE; i++) {
    for (const next of [i + 1, i + SIZE])
      if (adjacent(i, next) && swapGems(board, i, next)) return [i, next];
  }
  return null;
}

export function newBoard(random = Math.random): number[] {
  for (let attempt = 0; attempt < 30; attempt++) {
    const board: number[] = [];
    for (let i = 0; i < SIZE * SIZE; i++) {
      const choices = Array.from({ length: COLORS }, (_, c) => c + 1).filter(
        (color) =>
          !(
            i % SIZE >= 2 &&
            board[i - 1] === color &&
            board[i - 2] === color
          ) &&
          !(
            i >= 2 * SIZE &&
            board[i - SIZE] === color &&
            board[i - 2 * SIZE] === color
          ),
      );
      board.push(choices[Math.floor(random() * choices.length)]);
    }
    if (findMove(board)) return board;
  }
  // Bounded fallback: a stable board with a guaranteed 1 ↔ 9 opening move.
  const board = Array.from(
    { length: SIZE * SIZE },
    (_, i) => (((i % SIZE) + 2 * Math.floor(i / SIZE)) % COLORS) + 1,
  );
  [board[0], board[1], board[2], board[9]] = [1, 2, 1, 1];
  return board;
}

export function refill(board: number[], random = Math.random) {
  const result = Array(SIZE * SIZE).fill(0) as number[];
  const from = Array(SIZE * SIZE).fill(-1) as number[];
  for (let x = 0; x < SIZE; x++) {
    let row = SIZE - 1;
    for (let y = SIZE - 1; y >= 0; y--) {
      const index = y * SIZE + x;
      if (!board[index]) continue;
      const destination = row-- * SIZE + x;
      result[destination] = board[index];
      from[destination] = index;
    }
    for (; row >= 0; row--)
      result[row * SIZE + x] = Math.floor(random() * COLORS) + 1;
  }
  return { board: result, from };
}

export const newJewelState = (): JewelState => ({
  version: 1,
  board: newBoard(),
  score: 0,
  moves: 0,
});

export function isJewelState(value: unknown): value is JewelState {
  if (!value || typeof value !== 'object') return false;
  const state = value as JewelState;
  return (
    state.version === 1 &&
    Number.isSafeInteger(state.score) &&
    state.score >= 0 &&
    Number.isSafeInteger(state.moves) &&
    state.moves >= 0 &&
    Array.isArray(state.board) &&
    state.board.length === SIZE * SIZE &&
    state.board.every(
      (gem) => Number.isInteger(gem) && gem >= 1 && gem <= CUBE,
    ) &&
    !findMatches(state.board).length
  );
}
