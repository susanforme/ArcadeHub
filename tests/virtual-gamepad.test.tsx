import { afterEach, expect, test } from '@rstest/core';
import { getByRole } from '@testing-library/dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtualGamepad } from '../src/components/VirtualGamepad';
import { Input, InputManager } from '../src/shared/input';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const config = {
  directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const,
  buttons: [{ id: 'A' as const, action: 'DROP' as const, label: '开火' }],
};
let root: Root;
let host: HTMLDivElement;
let input: InputManager;
function render(disabled = false) {
  act(() =>
    root.render(
      <VirtualGamepad
        config={{ ...config, directions: [...config.directions] }}
        disabled={disabled}
      />,
    ),
  );
}
function mount() {
  input = new InputManager();
  Input.current = input;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  render();
  for (const element of host.querySelectorAll<HTMLElement>('button, fieldset'))
    element.setPointerCapture = () => {};
}
function pointer(target: Element, type: string, id: number, x = 0, y = 0) {
  act(() => {
    target.dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerType: 'touch',
        pointerId: id,
        clientX: x,
        clientY: y,
      }),
    );
  });
}
afterEach(() => {
  act(() => root.unmount());
  input.destroy();
  Input.current = null;
  host.remove();
});

test('direction drag passes through the dead zone, while a second finger fires', () => {
  mount();
  const left = getByRole(host, 'button', { name: '向左' });
  const fire = getByRole(host, 'button', { name: 'A：开火' });
  const pad = getByRole(host, 'group', { name: '方向键' });
  pad.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 132,
    bottom: 132,
    width: 132,
    height: 132,
    toJSON: () => ({}),
  });
  pointer(left, 'pointerdown', 1);
  pointer(fire, 'pointerdown', 2);
  expect(input.down('LEFT')).toBe(true);
  expect(input.down('DROP')).toBe(true);
  pointer(pad, 'pointermove', 1, 66, 66);
  expect(input.down('LEFT')).toBe(false);
  pointer(pad, 'pointermove', 1, 120, 66);
  expect(input.down('RIGHT')).toBe(true);
  expect(input.down('DROP')).toBe(true);
  pointer(pad, 'pointercancel', 1);
  expect(input.down('RIGHT')).toBe(false);
  expect(input.down('DROP')).toBe(true);
  pointer(fire, 'lostpointercapture', 2);
  expect(input.down('DROP')).toBe(false);
});

test('pause disables buttons and discards a captured contact', () => {
  mount();
  const fire = getByRole<HTMLButtonElement>(host, 'button', {
    name: 'A：开火',
  });
  pointer(fire, 'pointerdown', 1);
  expect(fire).toHaveAttribute('aria-pressed', 'true');
  render(true);
  expect(input.down('DROP')).toBe(false);
  expect(fire).toBeDisabled();
  expect(fire).toHaveAttribute('aria-pressed', 'false');
  render(false);
  expect(input.down('DROP')).toBe(false);
  pointer(fire, 'pointerup', 1);
  expect(input.down('DROP')).toBe(false);
});

test('keyboard button holds, assistive click pulses, and reset clears feedback', () => {
  mount();
  const fire = getByRole<HTMLButtonElement>(host, 'button', {
    name: 'A：开火',
  });
  act(() => {
    fire.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: ' ',
        code: 'Space',
        cancelable: true,
      }),
    );
  });
  expect(input.down('DROP')).toBe(true);
  expect(input.consume('DROP')).toBe(true);
  act(() => {
    fire.dispatchEvent(
      new KeyboardEvent('keyup', {
        bubbles: true,
        key: ' ',
        code: 'Space',
        cancelable: true,
      }),
    );
  });
  expect(input.down('DROP')).toBe(false);
  act(() => {
    fire.click();
  });
  expect(input.consume('DROP')).toBe(true);
  expect(input.down('DROP')).toBe(false);
  pointer(fire, 'pointerdown', 1);
  act(() => input.reset());
  expect(fire).toHaveAttribute('aria-pressed', 'false');
  pointer(fire, 'pointerup', 1);
  expect(input.down('DROP')).toBe(false);
});
