import { expect, test } from '@rstest/core';
import { InputManager } from '../src/shared/input';

test('keyboard input is consumed once, ignores repeats, and resets on blur', () => {
  const input = new InputManager();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
  expect(input.down('LEFT')).toBe(true);
  expect(input.consume('LEFT')).toBe(true);
  expect(input.consume('LEFT')).toBe(false);
  window.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'ArrowLeft', repeat: true }),
  );
  expect(input.consume('LEFT')).toBe(false);
  window.dispatchEvent(new Event('blur'));
  expect(input.down('LEFT')).toBe(false);
  input.destroy();
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
  expect(input.down('RIGHT')).toBe(false);
});

test('typing in a form does not control the game', () => {
  const input = new InputManager();
  const field = document.createElement('input');
  document.body.append(field);
  field.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'KeyA', bubbles: true }),
  );
  expect(input.down('LEFT')).toBe(false);
  field.remove();
  input.destroy();
});

test('holding gamepad Start across pause only triggers one pause action', () => {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  buttons[9].pressed = true;
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [{ buttons, axes: [0, 0] }],
  });
  const input = new InputManager();
  try {
    input.poll();
    expect(input.consume('PAUSE')).toBe(true);
    input.reset();
    input.poll();
    expect(input.consume('PAUSE')).toBe(false);
    buttons[9].pressed = false;
    input.poll();
    buttons[9].pressed = true;
    input.poll();
    expect(input.consume('PAUSE')).toBe(true);
  } finally {
    input.destroy();
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor);
    else Reflect.deleteProperty(navigator, 'getGamepads');
  }
});
