import { levels } from './levels';
import type { LodeSnapshot } from './vendor/engine';

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const integer = (v: unknown, min: number, max: number): v is number =>
  number(v, min, max) && Number.isInteger(v);
const position = (v: unknown) =>
  record(v) && integer(v.x, 0, 27) && integer(v.y, 0, 15);
const frames = (v: unknown, max: number) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= max &&
  v.every((frame) => integer(frame, 0, 32));
function sprite(v: unknown) {
  return (
    record(v) &&
    [
      'brick',
      'block',
      'ladder',
      'rope',
      'gold',
      'runner',
      'guard',
      'redhat',
      'hole',
    ].includes(String(v.spriteSheet)) &&
    number(v.x, -40, 1120) &&
    number(v.y, -44, 704) &&
    number(v.alpha, 0, 1) &&
    typeof v.paused === 'boolean' &&
    typeof v.currentAnimation === 'string' &&
    [
      '',
      'runRight',
      'runLeft',
      'runUpDn',
      'barRight',
      'barLeft',
      'fallRight',
      'fallLeft',
      'digRight',
      'digLeft',
      'shakeRight',
      'shakeLeft',
      'reborn',
      'fillHole',
    ].includes(v.currentAnimation) &&
    integer(v.currentFrame, 0, 32) &&
    number(v.currentAnimationFrame, 0, 11)
  );
}
function actor(v: unknown, isGuard: boolean) {
  if (!record(v) || !record(v.pos)) return false;
  return (
    sprite(v.sprite) &&
    position(v.pos) &&
    number(v.pos.xOffset, -20, 20) &&
    number(v.pos.yOffset, -22, 22) &&
    integer(v.action, -1, 12) &&
    typeof v.shape === 'string' &&
    (v.lastLeftRight === 1 ||
      v.lastLeftRight === 2 ||
      v.lastLeftRight === 'ACT_LEFT' ||
      v.lastLeftRight === 'ACT_RIGHT') &&
    (!isGuard || integer(v.hasGold, -1, 37)) &&
    (v.holePos === undefined || position(v.holePos)) &&
    (v.action !== 11 || position(v.holePos)) &&
    (v.action !== 10 ||
      (frames(v.shapeFrame, 6) &&
        integer(v.curFrameIdx, 0, 5) &&
        integer(v.curFrameTime, -1, 51))) &&
    (v.action !== 12 ||
      (integer(v.curFrameIdx, 0, 1) && integer(v.curFrameTime, -1, 6))) &&
    (v.shapeFrame === undefined || frames(v.shapeFrame, 6)) &&
    (v.curFrameIdx === undefined || integer(v.curFrameIdx, 0, 6)) &&
    (v.curFrameTime === undefined || integer(v.curFrameTime, -1, 51))
  );
}

export function isLodeSnapshot(value: unknown): value is LodeSnapshot {
  if (
    !record(value) ||
    value.version !== 1 ||
    !record(value.hole) ||
    !record(value.born) ||
    !Array.isArray(value.guards)
  )
    return false;
  const guardCount = value.guards.length;
  const queue = (list: unknown) =>
    Array.isArray(list) &&
    list.length <= guardCount &&
    new Set(list).size === list.length &&
    list.every((id) => integer(id, 0, guardCount - 1));
  const hole = value.hole;
  return (
    integer(value.level, 0, levels.length - 1) &&
    integer(value.score, 0, 100_000_000) &&
    integer(value.lives, 0, 100) &&
    typeof value.phase === 'string' &&
    ['ready', 'playing', 'dead', 'clear'].includes(value.phase) &&
    integer(value.waitTicks, 0, 28) &&
    (value.lives !== 0 || value.phase === 'dead') &&
    Array.isArray(value.map) &&
    value.map.length === 28 &&
    value.map.every(
      (column) =>
        Array.isArray(column) &&
        column.length === 16 &&
        column.every(
          (cell) =>
            record(cell) &&
            integer(cell.base, 0, 7) &&
            integer(cell.act, 0, 9) &&
            (cell.base === 0 ? cell.bitmap === null : sprite(cell.bitmap)),
        ),
    ) &&
    actor(value.runner, false) &&
    guardCount <= 5 &&
    value.guards.every((guard) => actor(guard, true)) &&
    integer(value.goldCount, 0, 448) &&
    integer(value.goldComplete, 0, 1) &&
    sprite(hole.sprite) &&
    (hole.action === 0 || hole.action === 9) &&
    hole.digLimit === 8 &&
    (hole.action !== 9 ||
      (position(hole.pos) &&
        record(hole.pos) &&
        integer(hole.pos.y, 0, 14) &&
        frames(hole.shapeFrame, 11) &&
        integer(hole.curFrameIdx, 0, 10))) &&
    Array.isArray(value.fills) &&
    value.fills.length <= 448 &&
    value.fills.every(
      (fill) =>
        record(fill) &&
        sprite(fill) &&
        position(fill.pos) &&
        integer(fill.curFrameIdx, 0, 3) &&
        integer(fill.curFrameTime, -1, 166),
    ) &&
    queue(value.shaking) &&
    queue(value.reborn) &&
    value.guards.every(
      (guard, id) =>
        record(guard) &&
        (guard.action !== 10 || (value.shaking as number[]).includes(id)) &&
        (guard.action !== 12 || (value.reborn as number[]).includes(id)),
    ) &&
    integer(value.moveOffset, 0, 5) &&
    integer(value.moveId, 0, Math.max(0, guardCount - 1)) &&
    integer(value.recordCount, 0, Number.MAX_SAFE_INTEGER) &&
    integer(value.rng, 0, 0xffffffff) &&
    Array.isArray(value.born.columns) &&
    value.born.columns.length === 28 &&
    new Set(value.born.columns).size === 28 &&
    value.born.columns.every((x) => integer(x, 0, 27)) &&
    integer(value.born.index, 0, 27)
  );
}
