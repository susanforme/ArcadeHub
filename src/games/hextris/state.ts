export const COLORS = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];
export const BLOCK_FIELDS = [
  'settled',
  'height',
  'fallingLane',
  'checked',
  'angle',
  'angularVelocity',
  'targetAngle',
  'deleted',
  'removed',
  'tint',
  'opacity',
  'initializing',
  'ict',
  'iter',
  'initLen',
  'attachedLane',
  'distFromHex',
] as const;
export type HexBlock = Record<(typeof BLOCK_FIELDS)[number], number> & {
  color: string;
};
export interface HexSnapshot {
  version: 1;
  score: number;
  hex: Record<
    | 'position'
    | 'angle'
    | 'targetAngle'
    | 'angularVelocity'
    | 'ct'
    | 'lastCombo'
    | 'comboMultiplier'
    | 'lastRotate',
    number
  >;
  lastColor: string;
  comboTime: number;
  lanes: HexBlock[][];
  falling: HexBlock[];
  wave: Record<
    'lastGen' | 'last' | 'nextGen' | 'start' | 'ct' | 'difficulty' | 'dt',
    number
  >;
  pattern: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);
const integer = (v: unknown, min: number, max: number): v is number =>
  finite(v) && Number.isInteger(v) && v >= min && v <= max;
function isBlock(v: unknown): v is HexBlock {
  return (
    object(v) &&
    BLOCK_FIELDS.every((key) => finite(v[key])) &&
    typeof v.color === 'string' &&
    COLORS.includes(v.color) &&
    integer(v.fallingLane, 0, 5) &&
    integer(v.attachedLane, 0, 5) &&
    integer(v.settled, 0, 1) &&
    integer(v.deleted, 0, 2) &&
    integer(v.removed, 0, 1) &&
    integer(v.initializing, 0, 1) &&
    integer(v.checked, 0, 1) &&
    finite(v.opacity) &&
    v.opacity >= 0 &&
    v.opacity <= 1 &&
    finite(v.distFromHex) &&
    v.distFromHex >= 0 &&
    v.distFromHex <= 1000 &&
    finite(v.iter) &&
    v.iter > 0 &&
    v.iter <= 20 &&
    v.height === 20 &&
    finite(v.initLen) &&
    v.initLen > 0
  );
}
export function isHexSnapshot(v: unknown): v is HexSnapshot {
  if (
    !object(v) ||
    v.version !== 1 ||
    !integer(v.score, 0, Number.MAX_SAFE_INTEGER) ||
    !object(v.hex) ||
    !object(v.wave) ||
    !integer(v.pattern, 0, 5) ||
    !finite(v.comboTime) ||
    v.comboTime <= 0 ||
    v.comboTime > 10000 ||
    typeof v.lastColor !== 'string' ||
    ![...COLORS, '#000'].includes(v.lastColor)
  )
    return false;
  if (
    ![
      'position',
      'angle',
      'targetAngle',
      'angularVelocity',
      'ct',
      'lastCombo',
      'comboMultiplier',
      'lastRotate',
    ].every((key) => finite((v.hex as Record<string, unknown>)[key])) ||
    !integer(v.hex.position, 0, 5) ||
    !finite(v.hex.ct) ||
    v.hex.ct < 0 ||
    !integer(v.hex.comboMultiplier, 1, 1000000)
  )
    return false;
  if (
    !['lastGen', 'last', 'nextGen', 'start', 'ct', 'difficulty', 'dt'].every(
      (key) => finite((v.wave as Record<string, unknown>)[key]),
    ) ||
    !finite(v.wave.nextGen) ||
    v.wave.nextGen < 500 ||
    v.wave.nextGen > 3000 ||
    !finite(v.wave.difficulty) ||
    v.wave.difficulty < 1 ||
    v.wave.difficulty > 36
  )
    return false;
  return (
    Array.isArray(v.lanes) &&
    v.lanes.length === 6 &&
    v.lanes.every(
      (lane, side) =>
        Array.isArray(lane) &&
        lane.length <= 16 &&
        lane.every((block) => isBlock(block) && block.attachedLane === side),
    ) &&
    Array.isArray(v.falling) &&
    v.falling.length <= 100 &&
    v.falling.every(isBlock)
  );
}
