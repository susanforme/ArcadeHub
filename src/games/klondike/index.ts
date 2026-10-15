import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';
export default {
  scenes: [MainScene],
  config: { width: 720, height: 800, pixelArt: true },
} satisfies GamePlugin;
