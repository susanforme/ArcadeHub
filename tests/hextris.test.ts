import { describe, expect, test } from '@rstest/core';
import { type HexBlock, isHexSnapshot } from '../src/games/hextris/state';
import { createEngine } from '../src/games/hextris/vendor/engine';

function context() {
  return new Proxy(
    {},
    { get: () => () => {}, set: () => true },
  ) as CanvasRenderingContext2D;
}
function block(side: number, level: number, color = '#e74c3c'): HexBlock {
  return {
    settled: 1,
    height: 20,
    fallingLane: (6 - side) % 6,
    checked: 1,
    angle: 0,
    angularVelocity: 0,
    targetAngle: 0,
    deleted: 0,
    removed: 0,
    tint: 0,
    opacity: 1,
    initializing: 0,
    ict: 0,
    iter: 1.2,
    initLen: 9,
    attachedLane: side,
    distFromHex: (87 * Math.sqrt(3)) / 2 + level * 20,
    color,
  };
}
describe('Hextris original engine adaptation', () => {
  test('starts with a data-only, valid snapshot and restores exactly', () => {
    const engine = createEngine(context(), undefined, () => 0.2);
    for (let i = 0; i < 220; i++) engine.tick();
    const snapshot = JSON.parse(JSON.stringify(engine.snapshot()));
    expect(isHexSnapshot(snapshot)).toBe(true);
    const restored = createEngine(context(), snapshot, () => 0.2);
    expect(restored.snapshot()).toEqual(snapshot);
    engine.tick();
    restored.tick();
    expect(restored.snapshot()).toEqual(engine.snapshot());
  });
  test('wraps rotation and rate-limits repeated input using simulation time', () => {
    const engine = createEngine(context());
    engine.rotate(-1);
    expect(engine.snapshot().hex.position).toBe(5);
    engine.rotate(-1);
    expect(engine.snapshot().hex.position).toBe(5);
    for (let i = 0; i < 5; i++) engine.tick();
    engine.rotate(1);
    expect(engine.snapshot().hex.position).toBe(0);
  });
  test('drawing a restored frame does not advance a rotation or deletion', () => {
    const state = createEngine(context()).snapshot();
    state.lanes[0] = [{ ...block(0, 0), deleted: 1, opacity: 0.8, tint: 0.6 }];
    const engine = createEngine(context(), state);
    engine.rotate(1);
    engine.tick();
    const before = engine.snapshot();
    const restored = createEngine(context(), before);
    restored.drawInitial();
    expect(restored.snapshot()).toEqual(before);
    restored.drawInitial();
    expect(restored.snapshot()).toEqual(before);
  });
  test('matches across the sixth/first lane boundary and scores the original square', () => {
    const state = createEngine(context()).snapshot();
    state.lanes[5] = [block(5, 0)];
    state.lanes[0] = [block(0, 0)];
    state.lanes[1] = [block(1, 0)];
    const engine = createEngine(context(), state);
    engine.tick();
    expect(engine.score).toBe(9);
    for (let i = 0; i < 18; i++) engine.tick();
    expect(engine.snapshot().lanes.flat()).toHaveLength(0);
  });
  test('two matching blocks do not clear and nine blocks exceed the eight-row limit', () => {
    const state = createEngine(context()).snapshot();
    state.lanes[0] = [block(0, 0), block(0, 1)];
    const engine = createEngine(context(), state);
    engine.tick();
    expect(engine.score).toBe(0);
    state.lanes[0] = Array.from({ length: 9 }, (_, i) =>
      block(0, i, i % 2 ? '#3498db' : '#e74c3c'),
    );
    expect(createEngine(context(), state).over).toBe(true);
  });
  test('rejects damaged states and starts cleanly', () => {
    const state = createEngine(context()).snapshot();
    expect(isHexSnapshot(null)).toBe(false);
    expect(isHexSnapshot({ ...state, pattern: 6 })).toBe(false);
    expect(isHexSnapshot({ ...state, hex: { ...state.hex, ct: NaN } })).toBe(
      false,
    );
    state.lanes[0] = [block(1, 0)];
    expect(isHexSnapshot(state)).toBe(false);
    expect(createEngine(context(), state).snapshot().lanes.flat()).toHaveLength(
      0,
    );
  });
});
