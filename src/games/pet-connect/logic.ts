export const COLS = 6;
export const ROWS = 8;
export const PETS = 12;
export const TIME_LIMIT = 180;
export interface Point {
  x: number;
  y: number;
}
export interface PetState {
  version: 1;
  board: number[];
  score: number;
  seconds: number;
}
const point = (index: number): Point => ({
  x: index % COLS,
  y: Math.floor(index / COLS),
});
const validIndex = (index: number) =>
  Number.isInteger(index) && index >= 0 && index < COLS * ROWS;

// The empty ring around the board is playable, as in classic tile connect.
function route(board: number[], first: number, second: number): Point[] | null {
  const a = point(first),
    b = point(second);
  const clear = (from: Point, to: Point) => {
    if (from.x !== to.x && from.y !== to.y) return false;
    const dx = Math.sign(to.x - from.x),
      dy = Math.sign(to.y - from.y);
    let x = from.x,
      y = from.y;
    while (true) {
      const index = y * COLS + x;
      if (
        x >= 0 &&
        x < COLS &&
        y >= 0 &&
        y < ROWS &&
        index !== first &&
        index !== second &&
        board[index] !== 0
      )
        return false;
      if (x === to.x && y === to.y) return true;
      x += dx;
      y += dy;
    }
  };
  const candidates: Point[][] = [
    [a, b],
    [a, { x: a.x, y: b.y }, b],
    [a, { x: b.x, y: a.y }, b],
  ];
  for (let x = -1; x <= COLS; x++)
    candidates.push([a, { x, y: a.y }, { x, y: b.y }, b]);
  for (let y = -1; y <= ROWS; y++)
    candidates.push([a, { x: a.x, y }, { x: b.x, y }, b]);
  for (const candidate of candidates) {
    if (!candidate.slice(1).every((p, i) => clear(candidate[i], p))) continue;
    const path = candidate.filter(
      (p, i) =>
        i === 0 || p.x !== candidate[i - 1].x || p.y !== candidate[i - 1].y,
    );
    return path.filter(
      (p, i) =>
        i === 0 ||
        i === path.length - 1 ||
        !(
          (path[i - 1].x === p.x && p.x === path[i + 1].x) ||
          (path[i - 1].y === p.y && p.y === path[i + 1].y)
        ),
    );
  }
  return null;
}
export function findPath(
  board: number[],
  first: number,
  second: number,
): Point[] | null {
  if (
    !validIndex(first) ||
    !validIndex(second) ||
    first === second ||
    !board[first] ||
    board[first] !== board[second]
  )
    return null;
  return route(board, first, second);
}
export function findMove(board: number[]): [number, number] | null {
  for (let a = 0; a < board.length; a++) {
    if (!board[a]) continue;
    for (let b = a + 1; b < board.length; b++)
      if (findPath(board, a, b)) return [a, b];
  }
  return null;
}
export function shuffleBoard(board: number[], random = Math.random): number[] {
  const positions = board.flatMap((value, index) => (value ? [index] : []));
  if (!positions.length) return [...board];
  const result = [...board];
  for (let attempt = 0; attempt < 30; attempt++) {
    for (let i = positions.length - 1; i > 0; i--) {
      const a = positions[i],
        b = positions[Math.floor(random() * (i + 1))];
      [result[a], result[b]] = [result[b], result[a]];
    }
    if (findMove(result)) return result;
  }
  // Guarantee a move even with an unlucky (or deterministic) shuffle.
  for (const a of positions)
    for (const b of positions) {
      if (a === b || !route(result, a, b)) continue;
      const partner = positions.find(
        (index) => index !== a && result[index] === result[a],
      );
      if (partner !== undefined) {
        [result[b], result[partner]] = [result[partner], result[b]];
        return result;
      }
    }
  return result;
}
export function newPetState(random = Math.random): PetState {
  return {
    version: 1,
    board: shuffleBoard(
      Array.from({ length: COLS * ROWS }, (_, i) => Math.floor(i / 4) + 1),
      random,
    ),
    score: 0,
    seconds: TIME_LIMIT,
  };
}
export function matchPets(state: PetState, first: number, second: number) {
  const path = findPath(state.board, first, second);
  if (!path) return null;
  const board = [...state.board];
  board[first] = 0;
  board[second] = 0;
  return { state: { ...state, board, score: state.score + 100 }, path };
}
export function isPetState(value: unknown): value is PetState {
  if (!value || typeof value !== 'object') return false;
  const state = value as PetState;
  if (
    state.version !== 1 ||
    !Array.isArray(state.board) ||
    state.board.length !== COLS * ROWS ||
    !Number.isFinite(state.seconds) ||
    state.seconds <= 0 ||
    state.seconds > TIME_LIMIT
  )
    return false;
  const counts = Array(PETS + 1).fill(0);
  for (const tile of state.board) {
    if (!Number.isInteger(tile) || tile < 0 || tile > PETS) return false;
    counts[tile]++;
  }
  return (
    counts[0] < COLS * ROWS &&
    counts.slice(1).every((count) => count % 2 === 0) &&
    state.score === (counts[0] / 2) * 100
  );
}
