import { expect, test } from '@rstest/core';
import { InputManager } from '../src/shared/input';
import { padDirections, VirtualInput } from '../src/shared/input/virtual';

test('releasing a touch does not release a held keyboard or another finger', () => {
  const input = new InputManager();
  const pad = new VirtualInput(input, 'four-way', () => {});
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
  pad.set('finger-1', ['LEFT']);
  pad.set('finger-2', ['DROP']);
  expect(input.down('DROP')).toBe(true);
  pad.release('finger-1');
  expect(input.down('LEFT')).toBe(true);
  expect(input.down('DROP')).toBe(true);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
  expect(input.down('LEFT')).toBe(false);
  pad.set('finger-3', ['DROP']);
  pad.release('finger-2');
  expect(input.down('DROP')).toBe(true);
  pad.destroy();
  expect(input.down('DROP')).toBe(false);
  input.destroy();
});

test('four-way turns release the previous direction and keep fire held', () => {
  const input = new InputManager();
  const pad = new VirtualInput(input, 'four-way', () => {});
  pad.set('direction', ['UP']);
  pad.set('fire', ['DROP']);
  input.consume('UP');
  pad.set('direction', ['RIGHT']);
  expect(input.down('UP')).toBe(false);
  expect(input.consume('RIGHT')).toBe(true);
  expect(input.down('DROP')).toBe(true);
  pad.set('direction', ['RIGHT']);
  expect(input.consume('RIGHT')).toBe(false);
  pad.set('second-direction', ['DOWN']);
  expect(input.down('RIGHT')).toBe(false);
  pad.release('second-direction');
  expect(input.down('RIGHT')).toBe(true);
  pad.destroy();
  input.destroy();
});

test('pause reset clears contacts and pending presses, requiring a fresh touch', () => {
  const input = new InputManager();
  const pad = new VirtualInput(input, 'four-way', () => {});
  pad.set('direction', ['LEFT']);
  pad.set('fire', ['DROP']);
  input.reset();
  expect(input.down('LEFT')).toBe(false);
  expect(input.consume('DROP')).toBe(false);
  pad.release('fire');
  expect(input.down('LEFT')).toBe(false);
  pad.set('fresh', ['RIGHT']);
  expect(input.consume('RIGHT')).toBe(true);
  pad.destroy();
  input.destroy();
});

test('eight-way mode allows diagonals, with a dead zone and outside release', () => {
  expect(padDirections(0.05, 0.05, 'eight-way')).toEqual([]);
  expect(padDirections(2, 0, 'four-way')).toEqual([]);
  expect(padDirections(0.6, -0.6, 'eight-way')).toEqual(['RIGHT', 'UP']);
  expect(padDirections(0.7, -0.1, 'eight-way')).toEqual(['RIGHT']);
  expect(padDirections(-0.7, 0.4, 'four-way')).toEqual(['LEFT']);
  const input = new InputManager();
  const pad = new VirtualInput(input, 'eight-way', () => {});
  pad.set('direction', ['RIGHT', 'UP']);
  expect(input.down('RIGHT')).toBe(true);
  expect(input.down('UP')).toBe(true);
  pad.destroy();
  input.destroy();
});

test('keyboard aliases retain ownership and gamepad reset suppresses held movement', () => {
  const input = new InputManager();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
  expect(input.down('LEFT')).toBe(true);
  input.destroy();
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  buttons[14].pressed = true;
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [{ buttons, axes: [0, 0] }],
  });
  const gamepadInput = new InputManager();
  try {
    gamepadInput.poll();
    expect(gamepadInput.consume('LEFT')).toBe(true);
    gamepadInput.reset();
    gamepadInput.poll();
    expect(gamepadInput.down('LEFT')).toBe(false);
    expect(gamepadInput.consume('LEFT')).toBe(false);
    buttons[14].pressed = false;
    gamepadInput.poll();
    buttons[14].pressed = true;
    gamepadInput.poll();
    expect(gamepadInput.down('LEFT')).toBe(true);
    expect(gamepadInput.consume('LEFT')).toBe(true);
  } finally {
    gamepadInput.destroy();
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor);
    else Reflect.deleteProperty(navigator, 'getGamepads');
  }
});

test('an action mapped to UP does not interrupt directional movement', () => {
  const input = new InputManager();
  const pad = new VirtualInput(input, 'four-way', () => {});
  pad.set('direction', ['RIGHT']);
  pad.set('A', ['UP'], false);
  expect(input.down('RIGHT')).toBe(true);
  expect(input.consume('UP')).toBe(true);
  pad.release('A');
  expect(input.down('RIGHT')).toBe(true);
  pad.destroy();
  input.destroy();
});
