import type { GamePlugin } from '../../core/types';
import { HEIGHT, WIDTH } from './logic';
import { MainScene } from './scenes/MainScene';

export default {
  scenes: [MainScene],
  config: { width: WIDTH, height: HEIGHT },
} satisfies GamePlugin;
