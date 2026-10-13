import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';
export default {
  scenes: [MainScene],
  config: { width: 480, height: 480 },
} satisfies GamePlugin;
