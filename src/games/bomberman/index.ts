import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';
export default {
  scenes: [MainScene],
  config: { width: 750, height: 600, pixelArt: true },
} satisfies GamePlugin;
