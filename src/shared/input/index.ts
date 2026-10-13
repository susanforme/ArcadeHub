import type { Action } from '../../core/types';

const keys: Record<string, Action> = {
  ArrowLeft: 'LEFT',
  KeyA: 'LEFT',
  ArrowRight: 'RIGHT',
  KeyD: 'RIGHT',
  ArrowUp: 'UP',
  KeyW: 'UP',
  ArrowDown: 'DOWN',
  KeyS: 'DOWN',
  Space: 'DROP',
  Escape: 'PAUSE',
  KeyP: 'PAUSE',
};
export class InputManager {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  private pads = new Set<Action>();
  private keydown = (event: KeyboardEvent) => {
    if (
      event.target instanceof Element &&
      event.target.closest('input, textarea, select, button, a')
    )
      return;
    const action = keys[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) this.press(action);
  };
  private keyup = (event: KeyboardEvent) => {
    const action = keys[event.code];
    if (action) this.release(action);
  };
  private blur = () => this.reset();
  constructor() {
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.blur);
  }
  press(action: Action) {
    if (!this.held.has(action)) this.pressed.add(action);
    this.held.add(action);
  }
  release(action: Action) {
    this.held.delete(action);
  }
  down(action: Action) {
    return this.held.has(action) || this.pads.has(action);
  }
  consume(action: Action) {
    const pressed = this.pressed.delete(action);
    return pressed;
  }
  poll() {
    const next = new Set<Action>();
    for (const pad of navigator.getGamepads?.() ?? []) {
      if (!pad) continue;
      if (pad.buttons[14]?.pressed || pad.axes[0] < -0.5) next.add('LEFT');
      if (pad.buttons[15]?.pressed || pad.axes[0] > 0.5) next.add('RIGHT');
      if (
        pad.buttons[12]?.pressed ||
        pad.buttons[0]?.pressed ||
        pad.axes[1] < -0.5
      )
        next.add('UP');
      if (pad.buttons[13]?.pressed || pad.axes[1] > 0.5) next.add('DOWN');
      if (pad.buttons[1]?.pressed) next.add('DROP');
      if (pad.buttons[9]?.pressed) next.add('PAUSE');
    }
    for (const action of next)
      if (!this.pads.has(action)) this.pressed.add(action);
    this.pads = next;
  }
  reset() {
    this.held.clear();
    this.pressed.clear();
  }
  destroy() {
    this.reset();
    this.pads.clear();
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.blur);
  }
}
export const Input = { current: null as InputManager | null };
