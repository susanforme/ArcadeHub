export const WIDTH = 8;
export const HEIGHT = 16;
export type Color = 0 | 1 | 2;
export type Speed = 0 | 1 | 2;
export interface Cell {
  color: Color;
  kind: 'virus' | 'pill';
  bond: number | null;
}
export interface Capsule {
  x: number;
  y: number;
  rotation: 0 | 1 | 2 | 3;
  colors: [Color, Color];
}
export type Phase =
  | 'ready'
  | 'falling'
  | 'clearing'
  | 'gravity'
  | 'cleared'
  | 'over';
export interface DrMarioState {
  version: 1;
  board: (Cell | null)[];
  active: Capsule | null;
  next: [Color, Color];
  level: number;
  speed: Speed;
  score: number;
  capsules: number;
  nextBond: number;
  phase: Phase;
  timer: number;
  clear: number[];
  chainViruses: number;
}

const randomColor = (random: () => number) => Math.floor(random() * 3) as Color;
const randomCapsule = (random: () => number): [Color, Color] => [
  randomColor(random),
  randomColor(random),
];

export function virusCount(board: (Cell | null)[]) {
  return board.filter((cell) => cell?.kind === 'virus').length;
}

export function virusBoard(
  level: number,
  random = Math.random,
): (Cell | null)[] {
  const board = Array<Cell | null>(WIDTH * HEIGHT).fill(null);
  const firstRow = level >= 19 ? 4 : level >= 15 ? 5 : 6;
  const positions: number[] = [];
  // Fill without any four-in-a-row, then remove cells. This always produces the
  // requested virus count, including the densely packed 84-virus final level.
  for (let y = firstRow; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      const choices: Color[] = [0, 1, 2];
      const allowed = choices.filter(
        (color) =>
          !(
            x >= 3 && [1, 2, 3].every((n) => board[index - n]?.color === color)
          ) &&
          !(
            y >= firstRow + 3 &&
            [1, 2, 3].every((n) => board[index - n * WIDTH]?.color === color)
          ),
      );
      board[index] = {
        kind: 'virus',
        color: allowed[Math.floor(random() * allowed.length)],
        bond: null,
      };
      positions.push(index);
    }
  }
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  for (const index of positions.slice(4 * (Math.min(20, level) + 1)))
    board[index] = null;
  return board;
}

export function newDrMario(
  level = 0,
  speed: Speed = 0,
  random = Math.random,
): DrMarioState {
  return {
    version: 1,
    board: virusBoard(level, random),
    active: null,
    next: randomCapsule(random),
    level,
    speed,
    score: 0,
    capsules: 0,
    nextBond: 1,
    phase: 'ready',
    timer: 0,
    clear: [],
    chainViruses: 0,
  };
}

export function capsuleCells(capsule: Capsule) {
  const { x, y, rotation, colors } = capsule;
  const coordinates = [
    [
      [x, y],
      [x + 1, y],
    ],
    [
      [x, y - 1],
      [x, y],
    ],
    [
      [x + 1, y],
      [x, y],
    ],
    [
      [x, y],
      [x, y - 1],
    ],
  ][rotation];
  return coordinates.map(([cx, cy], index) => ({
    x: cx,
    y: cy,
    color: colors[index],
  }));
}

export function fitsCapsule(board: (Cell | null)[], capsule: Capsule) {
  return capsuleCells(capsule).every(
    ({ x, y }) =>
      x >= 0 &&
      x < WIDTH &&
      y >= 0 &&
      y < HEIGHT &&
      board[y * WIDTH + x] === null,
  );
}

export function moveCapsule(
  state: DrMarioState,
  dx: number,
  dy = 0,
): DrMarioState {
  if (state.phase !== 'falling' || !state.active) return state;
  const active = {
    ...state.active,
    x: state.active.x + dx,
    y: state.active.y + dy,
  };
  return fitsCapsule(state.board, active) ? { ...state, active } : state;
}

export function rotateCapsule(
  state: DrMarioState,
  clockwise = true,
): DrMarioState {
  if (state.phase !== 'falling' || !state.active) return state;
  const rotated = {
    ...state.active,
    rotation: ((state.active.rotation + (clockwise ? 1 : 3)) %
      4) as Capsule['rotation'],
  };
  const offsets =
    rotated.rotation % 2
      ? [
          [0, 0],
          [0, 1],
        ]
      : [
          [0, 0],
          [-1, 0],
        ];
  for (const [dx, dy] of offsets) {
    const active = { ...rotated, x: rotated.x + dx, y: rotated.y + dy };
    if (fitsCapsule(state.board, active)) return { ...state, active };
  }
  return state;
}

export function findMatches(board: (Cell | null)[]) {
  const matched = new Set<number>();
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const index = y * WIDTH + x;
      const cell = board[index];
      if (!cell) continue;
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ]) {
        if (
          (dx && x > 0 && board[index - 1]?.color === cell.color) ||
          (dy && y > 0 && board[index - WIDTH]?.color === cell.color)
        )
          continue;
        const line: number[] = [];
        let nx = x;
        let ny = y;
        while (
          nx < WIDTH &&
          ny < HEIGHT &&
          board[ny * WIDTH + nx]?.color === cell.color
        ) {
          line.push(ny * WIDTH + nx);
          nx += dx;
          ny += dy;
        }
        if (line.length >= 4) for (const match of line) matched.add(match);
      }
    }
  }
  return [...matched];
}

export function removeMatches(board: (Cell | null)[], matches: number[]) {
  const removed = new Set(matches);
  const remaining = board.map((cell, index) =>
    removed.has(index) ? null : cell,
  );
  const counts = new Map<number, number>();
  for (const cell of remaining)
    if (cell?.bond !== null && cell?.bond !== undefined)
      counts.set(cell.bond, (counts.get(cell.bond) ?? 0) + 1);
  return remaining.map((cell) =>
    cell?.bond !== null &&
    cell?.bond !== undefined &&
    counts.get(cell.bond) === 1
      ? { ...cell, bond: null }
      : cell,
  );
}

export function gravityStep(board: (Cell | null)[]) {
  const next = [...board];
  const groups = new Map<string, number[]>();
  board.forEach((cell, index) => {
    if (cell?.kind !== 'pill') return;
    const key = cell.bond === null ? `single-${index}` : `pair-${cell.bond}`;
    const group = groups.get(key) ?? [];
    group.push(index);
    groups.set(key, group);
  });
  let moved = false;
  for (const group of [...groups.values()].sort(
    (a, b) => Math.max(...b) - Math.max(...a),
  )) {
    if (
      !group.every(
        (index) =>
          index + WIDTH < WIDTH * HEIGHT &&
          (next[index + WIDTH] === null || group.includes(index + WIDTH)),
      )
    )
      continue;
    const cells = group.map((index) => next[index]);
    group.forEach((index) => {
      next[index] = null;
    });
    group.forEach((index, position) => {
      next[index + WIDTH] = cells[position];
    });
    moved = true;
  }
  return { board: moved ? next : board, moved };
}

function spawnCapsule(state: DrMarioState, random: () => number): DrMarioState {
  const active: Capsule = { x: 3, y: 0, rotation: 0, colors: state.next };
  if (!fitsCapsule(state.board, active))
    return { ...state, active: null, phase: 'over', clear: [], timer: 0 };
  return {
    ...state,
    active,
    next: randomCapsule(random),
    phase: 'falling',
    timer: 0,
    clear: [],
    chainViruses: 0,
  };
}

export function startDrMario(state: DrMarioState, random = Math.random) {
  return state.phase === 'ready' ? spawnCapsule(state, random) : state;
}

export function nextDrLevel(state: DrMarioState, random = Math.random) {
  if (state.phase !== 'cleared' || state.level >= 20) return state;
  const next = newDrMario(state.level + 1, state.speed, random);
  next.score = state.score;
  return startDrMario(next, random);
}

export function fallDelay(state: DrMarioState) {
  return Math.max(
    80,
    [800, 500, 260][state.speed] * 0.9 ** Math.floor(state.capsules / 10),
  );
}

function resolveBoard(state: DrMarioState, random: () => number): DrMarioState {
  const clear = findMatches(state.board);
  if (clear.length)
    return { ...state, active: null, phase: 'clearing', clear, timer: 0 };
  if (!virusCount(state.board))
    return { ...state, active: null, phase: 'cleared', clear: [], timer: 0 };
  return spawnCapsule(state, random);
}

export function lockCapsule(
  state: DrMarioState,
  random = Math.random,
): DrMarioState {
  if (state.phase !== 'falling' || !state.active) return state;
  const board = [...state.board];
  for (const cell of capsuleCells(state.active)) {
    board[cell.y * WIDTH + cell.x] = {
      color: cell.color,
      kind: 'pill',
      bond: state.nextBond,
    };
  }
  return resolveBoard(
    {
      ...state,
      board,
      active: null,
      capsules: state.capsules + 1,
      nextBond: state.nextBond + 1,
      chainViruses: 0,
    },
    random,
  );
}

export function tickDrMario(
  state: DrMarioState,
  delta: number,
  softDrop = false,
  random = Math.random,
): DrMarioState {
  if (!['falling', 'clearing', 'gravity'].includes(state.phase)) return state;
  const delay =
    state.phase === 'clearing'
      ? 320
      : state.phase === 'gravity'
        ? 75
        : softDrop
          ? 45
          : fallDelay(state);
  const elapsed = state.timer + Math.max(0, Math.min(delta, 1000));
  if (elapsed < delay) return { ...state, timer: elapsed };
  const current = { ...state, timer: 0 };
  if (state.phase === 'falling') {
    const moved = moveCapsule(current, 0, 1);
    return moved === current ? lockCapsule(current, random) : moved;
  }
  if (state.phase === 'clearing') {
    const killed = state.clear.filter(
      (index) => state.board[index]?.kind === 'virus',
    ).length;
    let points = 0;
    for (let n = 0; n < killed; n++)
      points +=
        100 * (state.speed + 1) * 2 ** Math.min(5, state.chainViruses + n);
    return {
      ...current,
      board: removeMatches(state.board, state.clear),
      score: state.score + points,
      chainViruses: state.chainViruses + killed,
      clear: [],
      phase: 'gravity',
    };
  }
  const falling = gravityStep(state.board);
  return falling.moved
    ? { ...current, board: falling.board }
    : resolveBoard(current, random);
}

export function isDrMarioState(value: unknown): value is DrMarioState {
  if (!value || typeof value !== 'object') return false;
  const s = value as DrMarioState;
  const integer = (n: unknown, min: number, max = Number.MAX_SAFE_INTEGER) =>
    typeof n === 'number' && Number.isSafeInteger(n) && n >= min && n <= max;
  const color = (n: unknown) => integer(n, 0, 2);
  const pair = (n: unknown) =>
    Array.isArray(n) && n.length === 2 && n.every(color);
  if (
    s.version !== 1 ||
    !Array.isArray(s.board) ||
    s.board.length !== WIDTH * HEIGHT ||
    !integer(s.level, 0, 20) ||
    !integer(s.speed, 0, 2) ||
    !integer(s.score, 0) ||
    !integer(s.capsules, 0) ||
    !integer(s.nextBond, 1) ||
    !integer(s.chainViruses, 0, 84) ||
    !Number.isFinite(s.timer) ||
    s.timer < 0 ||
    s.timer > 1000 ||
    !pair(s.next) ||
    !['ready', 'falling', 'clearing', 'gravity', 'cleared', 'over'].includes(
      s.phase,
    ) ||
    !Array.isArray(s.clear) ||
    !s.clear.every((n) => integer(n, 0, WIDTH * HEIGHT - 1)) ||
    new Set(s.clear).size !== s.clear.length
  )
    return false;
  const bonds = new Map<number, number[]>();
  for (let index = 0; index < s.board.length; index++) {
    const cell = s.board[index];
    if (cell === null) continue;
    if (
      !cell ||
      typeof cell !== 'object' ||
      !color(cell.color) ||
      !['virus', 'pill'].includes(cell.kind) ||
      (cell.bond !== null && !integer(cell.bond, 1, s.nextBond - 1)) ||
      (cell.kind === 'virus' && cell.bond !== null)
    )
      return false;
    if (cell.bond !== null) {
      const group = bonds.get(cell.bond) ?? [];
      group.push(index);
      bonds.set(cell.bond, group);
    }
  }
  for (const group of bonds.values()) {
    if (group.length !== 2) return false;
    const [a, b] = group;
    if (
      Math.abs((a % WIDTH) - (b % WIDTH)) +
        Math.abs(Math.floor(a / WIDTH) - Math.floor(b / WIDTH)) !==
      1
    )
      return false;
  }
  if (s.phase === 'falling') {
    const p = s.active;
    if (
      !p ||
      !integer(p.x, 0, WIDTH - 1) ||
      !integer(p.y, 0, HEIGHT - 1) ||
      !integer(p.rotation, 0, 3) ||
      !pair(p.colors) ||
      !fitsCapsule(s.board, p)
    )
      return false;
  } else if (s.active !== null) return false;
  if (s.phase === 'clearing') {
    const expected = findMatches(s.board);
    if (
      !expected.length ||
      expected.length !== s.clear.length ||
      !expected.every((index) => s.clear.includes(index))
    )
      return false;
  } else if (s.clear.length) return false;
  if (s.phase === 'cleared' && virusCount(s.board)) return false;
  if (['ready', 'falling'].includes(s.phase) && !virusCount(s.board))
    return false;
  return true;
}
