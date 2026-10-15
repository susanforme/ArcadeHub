import type { GamePlugin } from '../../core/types';
import { MainScene } from './MainScene';
export default {
  scenes: [MainScene],
  config: { width: 704, height: 888, pixelArt: true },
} satisfies GamePlugin;
