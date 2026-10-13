import type Phaser from 'phaser';

export type Action = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'DROP' | 'PAUSE';
export type Direction = Extract<Action, 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'>;
export interface GamepadPosition {
  anchor: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  /** CSS pixels from the anchored edges, inside the safe area. */
  x: number;
  y: number;
  size: number;
}
export interface VirtualGamepadConfig {
  directions?: Direction[];
  directionMode?: 'four-way' | 'eight-way';
  buttons?: { id: 'A' | 'B'; action: Action; label: string; color?: string }[];
  opacity?: number;
  layout?: {
    portrait?: Partial<Record<'dpad' | 'A' | 'B', GamepadPosition>>;
    landscape?: Partial<Record<'dpad' | 'A' | 'B', GamepadPosition>>;
  };
}
export interface GameManifest {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: '街机' | '益智';
  cover: string;
  localPlayers?: 1 | 2;
  controls: { key: string; description: string }[];
  virtualGamepad?: VirtualGamepadConfig;
  touchControls: { action: Action; label: string; symbol: string }[];
  load: () => Promise<{ default: GamePlugin }>;
}
export interface GamePlugin {
  scenes: (new () => Phaser.Scene)[];
  config: { width: number; height: number };
}
export interface SessionState {
  score: number;
  status: 'loading' | 'playing' | 'paused' | 'over';
  message?: string;
}
