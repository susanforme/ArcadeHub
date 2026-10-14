import levels from './levels.json';

export { levels };
export type Difficulty = keyof typeof levels;
export interface MineState {
  version: 1;
  difficulty: Difficulty;
  cells: number[];
  marks: number[]; // 0 covered, 1 revealed, 2 flagged
  seconds: number;
  outcome: 'ready' | 'playing' | 'won' | 'lost';
  exploded: number | null;
}
export function newBoard(difficulty: Difficulty = 'beginner'): MineState {
  const { cols, rows } = levels[difficulty];
  return {
    version: 1,
    difficulty,
    cells: Array(cols * rows).fill(0),
    marks: Array(cols * rows).fill(0),
    seconds: 0,
    outcome: 'ready',
    exploded: null,
  };
}
export function neighbors(state: MineState, index: number): number[] {
  const { cols, rows } = levels[state.difficulty];
  const x = index % cols,
    y = Math.floor(index / cols);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      if (
        (dx || dy) &&
        x + dx >= 0 &&
        x + dx < cols &&
        y + dy >= 0 &&
        y + dy < rows
      )
        result.push((y + dy) * cols + x + dx);
  return result;
}
function plant(state: MineState, first: number, random: () => number) {
  const safe = new Set([first, ...neighbors(state, first)]);
  const candidates = state.cells.flatMap((_, i) => (safe.has(i) ? [] : [i]));
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  for (const index of candidates.slice(0, levels[state.difficulty].mines))
    state.cells[index] = -1;
  state.cells.forEach((value, i) => {
    if (value !== -1)
      state.cells[i] = neighbors(state, i).filter(
        (n) => state.cells[n] === -1,
      ).length;
  });
  state.outcome = 'playing';
}
function active(state: MineState, index: number) {
  return (
    (state.outcome === 'ready' || state.outcome === 'playing') &&
    Number.isInteger(index) &&
    index >= 0 &&
    index < state.cells.length
  );
}
export function flag(state: MineState, index: number): boolean {
  if (!active(state, index) || state.marks[index] === 1) return false;
  state.marks[index] = state.marks[index] === 2 ? 0 : 2;
  return true;
}
export function reveal(
  state: MineState,
  index: number,
  random = Math.random,
): boolean {
  if (!active(state, index) || state.marks[index] === 2) return false;
  if (state.outcome === 'ready') plant(state, index, random);
  let pending = [index];
  if (state.marks[index] === 1) {
    const around = neighbors(state, index);
    if (
      state.cells[index] === 0 ||
      around.filter((n) => state.marks[n] === 2).length !== state.cells[index]
    )
      return false;
    pending = around.filter((n) => state.marks[n] === 0);
  }
  let changed = false;
  while (pending.length) {
    const i = pending.pop();
    if (i === undefined || state.marks[i] !== 0) continue;
    state.marks[i] = 1;
    changed = true;
    if (state.cells[i] === -1) {
      state.exploded = i;
      state.outcome = 'lost';
      return true;
    }
    if (state.cells[i] === 0) pending.push(...neighbors(state, i));
  }
  if (state.cells.every((value, i) => value === -1 || state.marks[i] === 1)) {
    state.outcome = 'won';
    state.cells.forEach((value, i) => {
      if (value === -1) state.marks[i] = 2;
    });
  }
  return changed;
}
export function isMineState(value: unknown): value is MineState {
  if (!value || typeof value !== 'object') return false;
  const s = value as MineState;
  if (s.version !== 1 || !Object.keys(levels).includes(s.difficulty))
    return false;
  const { cols, rows, mines } = levels[s.difficulty];
  if (
    !Array.isArray(s.cells) ||
    !Array.isArray(s.marks) ||
    s.cells.length !== cols * rows ||
    s.marks.length !== s.cells.length ||
    !Number.isFinite(s.seconds) ||
    s.seconds < 0 ||
    s.exploded !== null ||
    !['ready', 'playing'].includes(s.outcome) ||
    !s.cells.every((n) => Number.isInteger(n) && n >= -1 && n <= 8) ||
    !s.marks.every((n) => Number.isInteger(n) && n >= 0 && n <= 2)
  )
    return false;
  if (s.outcome === 'ready')
    return (
      s.seconds === 0 &&
      s.cells.every((n) => n === 0) &&
      s.marks.every((n) => n !== 1)
    );
  return (
    s.cells.filter((n) => n === -1).length === mines &&
    s.marks.includes(1) &&
    s.cells.some((n, i) => n !== -1 && s.marks[i] !== 1) &&
    s.cells.every((n, i) =>
      n === -1
        ? s.marks[i] !== 1
        : n === neighbors(s, i).filter((j) => s.cells[j] === -1).length,
    )
  );
}
