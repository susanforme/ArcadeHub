// Frame rectangles in the upstream 2× Chromium sprite atlas.
export const frames: Record<string, [number, number, number, number]> = {
  idle: [1678, 2, 88, 94],
  blink: [1766, 2, 88, 94],
  run0: [1854, 2, 88, 94],
  run1: [1942, 2, 88, 94],
  crashed: [2118, 2, 88, 94],
  duck0: [2206, 2, 118, 94],
  duck1: [2324, 2, 117, 94],
  cloud: [166, 2, 92, 28],
  ground: [2, 104, 1200, 24],
  bird0: [260, 2, 92, 80],
  bird1: [352, 2, 92, 80],
  moon: [994, 2, 40, 80],
  star: [1276, 2, 18, 18],
  gameover: [1294, 28, 382, 22],
  restart: [2, 2, 72, 64],
};
for (let size = 1; size <= 3; size++) {
  frames[`small${size}`] = [446 + 17 * size * (size - 1), 2, 34 * size, 70];
  frames[`large${size}`] = [652 + 25 * size * (size - 1), 2, 50 * size, 100];
}
for (let digit = 0; digit <= 9; digit++)
  frames[`digit${digit}`] = [1294 + digit * 20, 2, 20, 26];
