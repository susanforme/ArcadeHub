export interface Cell {
  x: number;
  y: number;
}
export interface SnakeState {
  body: Cell[];
  direction: Cell;
  food: Cell | null;
  score: number;
}
export const SIZE = 20;
const equal = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
export function foodFor(body: Cell[], random = Math.random): Cell | null {
  const free: Cell[] = [];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (!body.some((cell) => equal(cell, { x, y }))) free.push({ x, y });
    }
  return free[Math.floor(random() * free.length)] ?? null;
}
export function newSnake(): SnakeState {
  const body = [
    { x: 8, y: 10 },
    { x: 7, y: 10 },
    { x: 6, y: 10 },
  ];
  return { body, direction: { x: 1, y: 0 }, food: foodFor(body), score: 0 };
}
export function stepSnake(
  state: SnakeState,
  requested: Cell,
): { state: SnakeState; over: boolean; ate: boolean } {
  const direction =
    requested.x === -state.direction.x && requested.y === -state.direction.y
      ? state.direction
      : requested;
  const head = {
    x: state.body[0].x + direction.x,
    y: state.body[0].y + direction.y,
  };
  const ate = state.food !== null && equal(head, state.food);
  const tail = ate ? state.body : state.body.slice(0, -1);
  if (
    head.x < 0 ||
    head.x >= SIZE ||
    head.y < 0 ||
    head.y >= SIZE ||
    tail.some((cell) => equal(cell, head))
  ) {
    return { state, over: true, ate: false };
  }
  const body = [head, ...tail];
  const next = {
    body,
    direction,
    food: ate ? foodFor(body) : state.food,
    score: state.score + (ate ? 10 : 0),
  };
  return { state: next, over: next.food === null, ate };
}
export function isSnakeState(value: unknown): value is SnakeState {
  if (!value || typeof value !== 'object') return false;
  const s = value as SnakeState;
  const cell = (p: Cell) =>
    p &&
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    p.x >= 0 &&
    p.x < SIZE &&
    p.y >= 0 &&
    p.y < SIZE;
  return (
    Array.isArray(s.body) &&
    s.body.length >= 3 &&
    s.body.length <= SIZE * SIZE &&
    s.body.every(cell) &&
    new Set(s.body.map((p) => `${p.x},${p.y}`)).size === s.body.length &&
    !!s.direction &&
    Math.abs(s.direction.x) + Math.abs(s.direction.y) === 1 &&
    Number.isInteger(s.direction.x) &&
    Number.isInteger(s.direction.y) &&
    s.food !== null &&
    cell(s.food) &&
    !s.body.some((p) => equal(p, s.food as Cell)) &&
    Number.isInteger(s.score) &&
    s.score >= 0
  );
}
