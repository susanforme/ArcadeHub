import type { Action } from '../../../core/types';
export interface BombermanEngine {
  readonly phase: 'menu' | 'playing' | 'over';
  readonly players: 1 | 2;
  readonly score: number;
  step(
    input: Partial<Record<Action, boolean>>,
    pressed: Partial<Record<Action, boolean>>,
    delta: number,
  ): void;
  render(): void;
  snapshot(): unknown;
  restore(saved: unknown): boolean;
}
export function createBomberman(
  canvas: HTMLCanvasElement,
  assets: Record<string, CanvasImageSource>,
  text: (key: string, values?: Record<string, string | number>) => string,
  play?: (sound: string) => void,
): BombermanEngine;
