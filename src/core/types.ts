import type Phaser from 'phaser';

export type Action = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'DROP' | 'PAUSE';
export interface GameManifest {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  category: '街机' | '益智';
  cover: string;
  controls: { key: string; description: string }[];
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
