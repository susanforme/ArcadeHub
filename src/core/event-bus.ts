import type { SessionState } from './types';

type Events = {
  state: SessionState;
  pause: undefined;
  restart: undefined;
  storageError: string;
  saved: undefined;
};
class EventBus {
  private listeners = new Map<keyof Events, Set<(value: never) => void>>();
  on<K extends keyof Events>(event: K, listener: (value: Events[K]) => void) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener as (value: never) => void);
    this.listeners.set(event, listeners);
    return () => {
      listeners.delete(listener as (value: never) => void);
    };
  }
  emit<K extends keyof Events>(event: K, value: Events[K]) {
    for (const listener of [...(this.listeners.get(event) ?? [])])
      listener(value as never);
  }
}
export const events = new EventBus();
