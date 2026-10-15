import type { HexSnapshot } from '../state';
export interface HexEngine {
  readonly score: number;
  readonly over: boolean;
  readonly combo: number;
  rotate(steps: number): void;
  tick(fast?: boolean): void;
  drawInitial(): void;
  snapshot(): HexSnapshot;
}
export function createEngine(
  context: CanvasRenderingContext2D,
  saved?: unknown,
  random?: () => number,
): HexEngine;
