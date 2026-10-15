import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';

export default {
  scenes: [MainScene],
  config: { width: 848, height: 576 },
} satisfies GamePlugin;
