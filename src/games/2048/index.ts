import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';
export default {
  scenes: [MainScene],
  config: { width: 520, height: 625 },
} satisfies GamePlugin;
