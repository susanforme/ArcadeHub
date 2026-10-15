import paths from './assets/paths.json';

export const BALL_SIZE = 30;
export const LEVEL_COUNT = 9;
export type Point = { x: number; y: number };
export const MAPS = [
  { id: 'spiral', frog: { x: 431, y: 297 } },
  { id: 'claw', frog: { x: 437, y: 299 } },
  { id: 'tiltspiral', frog: { x: 346, y: 312 } },
] as const;

export function mapFor(level: number) {
  return MAPS[(level - 1) % MAPS.length];
}

// Community CURV tracks, sampled every six points; x + 104 aligns the HD background.
export const TRACKS = MAPS.map(({ id }) => {
  let distance = 0;
  return paths[id].map(([x, y], index, points) => {
    if (index)
      distance += Math.hypot(
        x - points[index - 1][0],
        y - points[index - 1][1],
      );
    return { x, y, distance };
  });
});

export function trackFor(level: number) {
  return TRACKS[(level - 1) % TRACKS.length];
}

export function pointAt(level: number, distance: number): Point {
  const track = trackFor(level);
  if (distance <= 0) return track[0];
  let low = 1;
  let high = track.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (track[middle].distance < distance) low = middle + 1;
    else high = middle;
  }
  const a = track[low - 1];
  const b = track[low];
  const ratio = Math.min(
    1,
    (distance - a.distance) / (b.distance - a.distance),
  );
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}

export function lengthOf(level: number) {
  const track = trackFor(level);
  return track[track.length - 1].distance;
}
