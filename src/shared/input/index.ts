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
  private held = new Map<string, Set<Action>>();
  private suppressedPads = new Set<Action>();
  private resetListeners = new Set<() => void>();
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
    if (!event.repeat) this.press(action, `key:${event.code}`);
  };
  private keyup = (event: KeyboardEvent) => {
    const action = keys[event.code];
    if (action) this.release(action, `key:${event.code}`);
  };
  private blur = () => this.reset();
  private visibility = () => {
    if (document.hidden) this.reset();
  };
  constructor() {
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
    window.addEventListener('blur', this.blur);
    document.addEventListener('visibilitychange', this.visibility);
  }
  press(action: Action, source = 'default') {
    if (!this.down(action)) this.pressed.add(action);
    let actions = this.held.get(source);
    if (!actions) {
      actions = new Set();
      this.held.set(source, actions);
    }
    actions.add(action);
  }
  release(action: Action, source = 'default') {
    const actions = this.held.get(source);
    actions?.delete(action);
    if (!actions?.size) this.held.delete(source);
  }
  down(action: Action) {
    return (
      [...this.held.values()].some((actions) => actions.has(action)) ||
      (this.pads.has(action) && !this.suppressedPads.has(action))
    );
  }
  onReset(listener: () => void) {
    this.resetListeners.add(listener);
    return () => {
      this.resetListeners.delete(listener);
    };
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
    for (const action of this.suppressedPads)
      if (!next.has(action)) this.suppressedPads.delete(action);
    for (const action of next)
      if (!this.pads.has(action) && !this.down(action))
        this.pressed.add(action);
    this.pads = next;
  }
  reset() {
    this.held.clear();
    this.pressed.clear();
    this.suppressedPads = new Set(this.pads);
    for (const listener of this.resetListeners) listener();
  }
  destroy() {
    this.reset();
    this.pads.clear();
    this.resetListeners.clear();
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
export const Input = { current: null as InputManager | null };
