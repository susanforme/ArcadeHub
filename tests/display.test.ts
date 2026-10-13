import { expect, test } from '@rstest/core';
import { renderSize } from '../src/core/game-display';

test('fits the game aspect ratio and renders at displayed size times DPR', () => {
  expect(
    renderSize({ width: 480, height: 480 }, { width: 1280, height: 700 }, 2),
  ).toEqual({ width: 1400, height: 1400 });
  expect(
    renderSize({ width: 400, height: 500 }, { width: 390, height: 700 }, 3),
  ).toEqual({ width: 1170, height: 1463 });
});
test('small mode and fractional DPR use integer backing pixels', () => {
  expect(
    renderSize({ width: 480, height: 480 }, { width: 335, height: 440 }, 1.25),
  ).toEqual({ width: 419, height: 419 });
});
