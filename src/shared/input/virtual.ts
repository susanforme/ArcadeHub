import type { Action, Direction } from '../../core/types';
import type { InputManager } from './index';

const directions = new Set<Action>(['UP', 'DOWN', 'LEFT', 'RIGHT']);

/** Keep pointer ownership separate from keyboard and canvas input. */
export class VirtualInput {
  private contacts = new Map<
    string,
    { actions: Action[]; directional: boolean }
  >();
  private active = new Set<Action>();
  private source = `virtual:${++VirtualInput.sequence}`;
  private static sequence = 0;
  private unsubscribe: () => void;

  constructor(
    private input: InputManager,
    private mode: 'four-way' | 'eight-way',
    private changed: (active: Set<Action>, reset?: boolean) => void,
  ) {
    this.unsubscribe = input.onReset(() => {
      this.contacts.clear();
      this.active.clear();
      this.changed(new Set(), true);
    });
  }
  set(contact: string, actions: Action[], directional = true) {
    this.contacts.delete(contact);
    if (actions.length) this.contacts.set(contact, { actions, directional });
    this.sync();
  }
  release(contact: string) {
    this.contacts.delete(contact);
    this.sync();
  }
  clear() {
    this.contacts.clear();
    this.sync();
  }
  destroy() {
    this.clear();
    this.unsubscribe();
  }
  private sync() {
    const next = new Set<Action>();
    let lastDirection: Action | undefined;
    for (const { actions, directional } of this.contacts.values()) {
      for (const action of actions) {
        if (directional && this.mode === 'four-way' && directions.has(action))
          lastDirection = action;
        else next.add(action);
      }
    }
    if (lastDirection) next.add(lastDirection);
    for (const action of this.active)
      if (!next.has(action)) this.input.release(action, this.source);
    for (const action of next)
      if (!this.active.has(action)) this.input.press(action, this.source);
    if (
      next.size !== this.active.size ||
      [...next].some((action) => !this.active.has(action))
    ) {
      this.active = next;
      this.changed(new Set(next));
    }
  }
}

/** Normalized coordinates relative to the direction pad center. */
export function padDirections(
  x: number,
  y: number,
  mode: 'four-way' | 'eight-way',
): Direction[] {
  const distance = Math.hypot(x, y);
  if (distance < 0.2 || distance > 1.25) return [];
  const horizontal: Direction = x < 0 ? 'LEFT' : 'RIGHT';
  const vertical: Direction = y < 0 ? 'UP' : 'DOWN';
  if (mode === 'four-way')
    return [Math.abs(x) > Math.abs(y) ? horizontal : vertical];
  const result: Direction[] = [];
  if (Math.abs(x) > distance * 0.38) result.push(horizontal);
  if (Math.abs(y) > distance * 0.38) result.push(vertical);
  return result;
}
