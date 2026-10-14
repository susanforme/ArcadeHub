export type Element = 'fire' | 'water';
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Level {
  time: number;
  platforms: Rect[];
  pools: (Rect & { kind: Element | 'poison' })[];
  gems: { x: number; y: number; kind: Element }[];
  plates: Rect[];
  gates: (Rect & { plate: number; lever: { x: number; y: number } })[];
  crates: Rect[];
  exits: { x: number; y: number; kind: Element }[];
}
export const WIDTH = 960,
  HEIGHT = 640;
const platforms: Rect[] = [
  { x: 24, y: 560, w: 912, h: 32 },
  { x: 585, y: 505, w: 65, h: 20 },
  { x: 665, y: 450, w: 58, h: 20 },
  { x: 740, y: 395, w: 196, h: 24 },
];
const exits: Level['exits'] = [
  { x: 832, y: 395, kind: 'fire' },
  { x: 900, y: 395, kind: 'water' },
];
export const LEVELS: Level[] = [
  {
    time: 150,
    platforms,
    exits,
    pools: [
      { x: 220, y: 550, w: 70, h: 12, kind: 'fire' },
      { x: 325, y: 550, w: 70, h: 12, kind: 'water' },
    ],
    gems: [
      { x: 160, y: 533, kind: 'fire' },
      { x: 255, y: 533, kind: 'fire' },
      { x: 190, y: 533, kind: 'water' },
      { x: 360, y: 533, kind: 'water' },
      { x: 615, y: 478, kind: 'fire' },
      { x: 695, y: 423, kind: 'water' },
    ],
    plates: [{ x: 450, y: 554, w: 48, h: 6 }],
    gates: [
      { x: 520, y: 380, w: 22, h: 180, plate: 0, lever: { x: 570, y: 540 } },
    ],
    crates: [{ x: 405, y: 522, w: 38, h: 38 }],
  },
  {
    time: 170,
    platforms,
    exits,
    pools: [
      { x: 190, y: 550, w: 75, h: 12, kind: 'water' },
      { x: 290, y: 550, w: 60, h: 12, kind: 'fire' },
      { x: 380, y: 550, w: 48, h: 12, kind: 'poison' },
    ],
    gems: [
      { x: 225, y: 533, kind: 'water' },
      { x: 325, y: 533, kind: 'fire' },
      { x: 570, y: 533, kind: 'water' },
      { x: 615, y: 478, kind: 'fire' },
      { x: 850, y: 365, kind: 'fire' },
      { x: 905, y: 365, kind: 'water' },
    ],
    plates: [
      { x: 478, y: 554, w: 30, h: 6 },
      { x: 748, y: 389, w: 36, h: 6 },
    ],
    gates: [
      { x: 520, y: 380, w: 22, h: 180, plate: 0, lever: { x: 570, y: 540 } },
      { x: 790, y: 280, w: 18, h: 115, plate: 1, lever: { x: 860, y: 375 } },
    ],
    crates: [{ x: 430, y: 522, w: 38, h: 38 }],
  },
  {
    time: 180,
    platforms,
    exits,
    pools: [
      { x: 165, y: 550, w: 60, h: 12, kind: 'fire' },
      { x: 270, y: 550, w: 55, h: 12, kind: 'poison' },
      { x: 350, y: 550, w: 75, h: 12, kind: 'water' },
    ],
    gems: [
      { x: 200, y: 533, kind: 'fire' },
      { x: 385, y: 533, kind: 'water' },
      { x: 555, y: 533, kind: 'fire' },
      { x: 615, y: 478, kind: 'water' },
      { x: 695, y: 423, kind: 'fire' },
      { x: 765, y: 365, kind: 'water' },
      { x: 860, y: 365, kind: 'water' },
      { x: 905, y: 365, kind: 'fire' },
    ],
    plates: [
      { x: 460, y: 554, w: 38, h: 6 },
      { x: 748, y: 389, w: 36, h: 6 },
    ],
    gates: [
      { x: 520, y: 380, w: 22, h: 180, plate: 0, lever: { x: 570, y: 540 } },
      { x: 790, y: 280, w: 18, h: 115, plate: 1, lever: { x: 860, y: 375 } },
    ],
    crates: [{ x: 420, y: 522, w: 38, h: 38 }],
  },
];
