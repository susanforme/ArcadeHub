import type { GamePlugin } from '../../core/types';
import { SkiScene } from './Scene';
export default {
  scenes: [SkiScene],
  config: { width: 600, height: 780, pixelArt: true },
} satisfies GamePlugin;
