export type Phase = 'ready' | 'playing' | 'dead' | 'clear' | 'over' | 'won';
export interface Position {
  x: number;
  y: number;
  xOffset: number;
  yOffset: number;
}
export interface SpriteState {
  spriteSheet: string;
  x: number;
  y: number;
  alpha: number;
  paused: boolean;
  currentFrame: number;
  currentAnimation: string;
  currentAnimationFrame: number;
  pos?: { x: number; y: number };
  curFrameIdx?: number;
  curFrameTime?: number;
}
export interface Actor {
  sprite: SpriteState;
  pos: Position;
  action: number;
  shape: string;
  lastLeftRight: number | string;
  hasGold?: number;
  holePos?: { x: number; y: number };
  shapeFrame?: number[];
  curFrameIdx?: number;
  curFrameTime?: number;
}
export interface LodeSnapshot {
  version: 1;
  level: number;
  score: number;
  lives: number;
  phase: Phase;
  waitTicks: number;
  map: { base: number; act: number; bitmap: SpriteState | null }[][];
  runner: Actor;
  guards: Actor[];
  goldCount: number;
  goldComplete: number;
  hole: {
    sprite: SpriteState;
    action: number;
    digLimit: number;
    pos?: { x: number; y: number };
    shapeFrame?: number[];
    curFrameIdx?: number;
  };
  fills: SpriteState[];
  shaking: number[];
  reborn: number[];
  moveOffset: number;
  moveId: number;
  recordCount: number;
  rng: number;
  born: { columns: number[]; index: number };
}
export interface LodeGame {
  tick(action?: number): void;
  retry(): void;
  snapshot(): LodeSnapshot;
  restore(snapshot: LodeSnapshot): void;
  objects(): SpriteState[];
  readonly level: number;
  readonly score: number;
  readonly lives: number;
  readonly phase: Phase;
  readonly gold: number;
}
export function createLodeRunner(
  options?: { level?: number; score?: number; lives?: number; seed?: number },
  sound?: (name: string, stop?: boolean) => void,
): LodeGame;
