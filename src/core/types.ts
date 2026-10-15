import type Phaser from 'phaser';
import type { TranslationKey } from '../i18n/translate';

export type Action =
  | 'LEFT'
  | 'RIGHT'
  | 'UP'
  | 'DOWN'
  | 'DROP'
  | 'PAUSE'
  | 'START'
  | 'SPECIAL'
  | 'SECONDARY'
  | 'THRUST'
  | 'REVERSE'
  | 'AIM_UP'
  | 'AIM_DOWN'
  | 'MODE'
  | 'FIRE_LEFT'
  | 'FIRE_RIGHT'
  | 'P2_UP'
  | 'P2_DOWN'
  | 'P2_LEFT'
  | 'P2_RIGHT'
  | 'P2_AIM_UP'
  | 'P2_AIM_DOWN'
  | 'P2_FIRE';
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
  buttons?: {
    id: 'A' | 'B' | 'X' | 'Y' | 'L' | 'R';
    action: Action;
    label: string;
    color?: string;
  }[];
  opacity?: number;
  layout?: {
    portrait?: Partial<
      Record<'dpad' | 'A' | 'B' | 'X' | 'Y' | 'L' | 'R', GamepadPosition>
    >;
    landscape?: Partial<
      Record<'dpad' | 'A' | 'B' | 'X' | 'Y' | 'L' | 'R', GamepadPosition>
    >;
  };
}
interface GameManifestBase {
  id: string;
  /** Timestamp in milliseconds when the game was added to the library. */
  addedAt: number;
  name: TranslationKey;
  subtitle: TranslationKey;
  description: TranslationKey;
  category: 'categories.arcade' | 'categories.puzzle';
  cover: string;
  localPlayers?: 1 | 2;
  controls: { key: string; description: TranslationKey }[];
  virtualGamepad?: VirtualGamepadConfig;
  touchControls: { action: Action; label: string; symbol: string }[];
}
export type GameManifest = GameManifestBase & {
  source?: string;
  load: () => Promise<{ default: GamePlugin }>;
};
export interface GamePlugin {
  scenes: (new () => Phaser.Scene)[];
  config: { width: number; height: number; pixelArt?: boolean };
}
export interface SessionState {
  score: number;
  status: 'loading' | 'playing' | 'paused' | 'over';
  message?: string;
}
