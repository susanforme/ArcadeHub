import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';

export default {
  scenes: [MainScene],
  config: { width: 800, height: 800 },
} satisfies GamePlugin;
