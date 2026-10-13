import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';
export default {
  scenes: [MainScene],
  config: { width: 448, height: 612 },
} satisfies GamePlugin;
