import type { GamePlugin } from '../../core/types';
export interface EngineKey {
  key: string;
  code: string;
  repeat: boolean;
  preventDefault(): void;
}
export interface EngineInput {
  keyDown(event: EngineKey): void;
  keyUp(event: EngineKey): void;
  mouseX?: number;
  mouseY?: number;
  [key: string]: unknown;
}
export interface SoundHost {
  context(): AudioContext;
  destination(): AudioNode;
  after(callback: () => void, delay: number): object;
  every(callback: () => void, delay: number): object;
  cancel(timer: object): void;
}
export interface EngineSession {
  game: Record<string, unknown> & {
    state: string;
    clock: number;
    highScore?: number;
  };
  input: EngineInput;
  sound: { init(): void; [key: string]: unknown };
  renderer: object;
  canvas: HTMLCanvasElement;
}
export interface ArcadeEngine {
  config: GamePlugin['config'];
  classes: Record<string, { prototype: object }>;
  create(canvas: HTMLCanvasElement, host: SoundHost): EngineSession;
  step(session: EngineSession, delta: number): void;
  render(session: EngineSession): void;
  score(session: EngineSession): number;
}
