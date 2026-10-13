export const COLS = 10;
export const ROWS = 20;
export const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [2, 2],
    [2, 2],
  ],
  [
    [0, 3, 0],
    [3, 3, 3],
  ],
  [
    [0, 4, 4],
    [4, 4, 0],
  ],
  [
    [5, 5, 0],
    [0, 5, 5],
  ],
  [
    [6, 0, 0],
    [6, 6, 6],
  ],
  [
    [0, 0, 7],
    [7, 7, 7],
  ],
];
export interface Piece {
  cells: number[][];
  x: number;
  y: number;
}
export interface TetrisState {
  board: number[][];
  piece: Piece;
  next: number[][];
  score: number;
  lines: number;
}
export function randomShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)].map((row) => [
    ...row,
  ]);
}
export function newPiece(cells: number[][]): Piece {
  return { cells, x: Math.floor((COLS - cells[0].length) / 2), y: 0 };
}
export function newTetris(): TetrisState {
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: newPiece(randomShape()),
    next: randomShape(),
    score: 0,
    lines: 0,
  };
}
export function fits(board: number[][], piece: Piece) {
  return piece.cells.every((row, y) =>
    row.every(
      (cell, x) =>
        !cell ||
        (piece.x + x >= 0 &&
          piece.x + x < COLS &&
          piece.y + y >= 0 &&
          piece.y + y < ROWS &&
          board[piece.y + y][piece.x + x] === 0),
    ),
  );
}
export function rotate(board: number[][], piece: Piece): Piece {
  const cells = piece.cells[0].map((_, x) =>
    piece.cells.map((row) => row[x]).reverse(),
  );
  for (const offset of [0, -1, 1, -2, 2, -3, 3]) {
    const candidate = { ...piece, cells, x: piece.x + offset };
    if (fits(board, candidate)) return candidate;
  }
  return piece;
}
export function lockPiece(state: TetrisState) {
  const board = state.board.map((row) => [...row]);
  state.piece.cells.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) board[state.piece.y + y][state.piece.x + x] = cell;
    });
  });
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = ROWS - remaining.length;
  const next = {
    board: [
      ...Array.from({ length: cleared }, () => Array(COLS).fill(0)),
      ...remaining,
    ],
    piece: newPiece(state.next),
    next: randomShape(),
    lines: state.lines + cleared,
    score:
      state.score +
      [0, 100, 300, 500, 800][cleared] * (Math.floor(state.lines / 10) + 1),
  };
  return { state: next, cleared, over: !fits(next.board, next.piece) };
}
export function isTetrisState(value: unknown): value is TetrisState {
  if (!value || typeof value !== 'object') return false;
  const s = value as TetrisState;
  const matrix = (m: number[][], rows: number, cols: number) =>
    Array.isArray(m) &&
    m.length === rows &&
    m.every(
      (row) =>
        Array.isArray(row) &&
        row.length === cols &&
        row.every((n) => Number.isInteger(n) && n >= 0 && n <= 7),
    );
  const shape = (m: number[][]) =>
    Array.isArray(m) &&
    m.length > 0 &&
    m.length <= 4 &&
    Array.isArray(m[0]) &&
    m[0].length > 0 &&
    m[0].length <= 4 &&
    matrix(m, m.length, m[0].length) &&
    m.flat().some(Boolean);
  return (
    matrix(s.board, ROWS, COLS) &&
    !!s.piece &&
    shape(s.piece.cells) &&
    shape(s.next) &&
    Number.isInteger(s.piece.x) &&
    Number.isInteger(s.piece.y) &&
    fits(s.board, s.piece) &&
    Number.isInteger(s.score) &&
    s.score >= 0 &&
    Number.isInteger(s.lines) &&
    s.lines >= 0
  );
}
