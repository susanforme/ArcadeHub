import type { GamePlugin } from '../../core/types';
import { HEIGHT, WIDTH } from './render';
import { LodeScene } from './scene';
export default {
  scenes: [LodeScene],
  config: { width: WIDTH, height: HEIGHT, pixelArt: true },
} satisfies GamePlugin;
