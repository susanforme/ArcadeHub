export const SIZE = 11;
export const FLOOR_COUNT = 12;

// Compact original campaign, using the classic community tile vocabulary.
// Every floor has a repeatable route; the test suite executes a complete ascent.
const layouts = [
  [
    '###########',
    '#..y.Y.aG>#',
    '#.###.#####',
    '#b..#d..#p#',
    '#.#.#.#.#.#',
    '#p#...#...#',
    '#.#.###.#.#',
    '#s..#a..#r#',
    '#.###.###.#',
    '#<.y.m.p..#',
    '###########',
  ],
  [
    '###########',
    '#b.B.p.aG>#',
    '#.###.#####',
    '#..m#d.p..#',
    '#.#.#.###.#',
    '#y#...#r.R#',
    '#.#.#.#.#.#',
    '#s..#a..#p#',
    '#.###.###.#',
    '#<.y.m.d..#',
    '###########',
  ],
  [
    '###########',
    '#r.R.d.aG>#',
    '#.###.#####',
    '#y..#p..#b#',
    '#.#.#.#.#.#',
    '#m#...#m..#',
    '#.#.###.#.#',
    '#s..#d..#p#',
    '#.###.###.#',
    '#<.y.m.a..#',
    '###########',
  ],
] as const;

export const floors = Array.from({ length: FLOOR_COUNT }, (_, floor) =>
  layouts[floor % layouts.length].join('').split(''),
);
export const ENTRY = 9 * SIZE + 1;
export const EXIT = SIZE + 9;
export const TOKENS = '#.<>ybrYBRadpmsG';

export interface Enemy {
  hp: number;
  attack: number;
  defense: number;
  gold: number;
  frame: number;
}
export function enemyFor(floor: number, guardian = false): Enemy {
  return guardian
    ? {
        hp: 65 + floor * 12,
        attack: 21 + floor * 3,
        defense: 7 + floor * 2,
        gold: 20 + floor * 5,
        frame: floor === FLOOR_COUNT - 1 ? 26 : 8,
      }
    : {
        hp: 35 + floor * 8,
        attack: 14 + floor * 3,
        defense: 3 + floor,
        gold: 10 + floor * 3,
        frame: [0, 4, 8][floor % 3],
      };
}
