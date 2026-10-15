import type { GamePlugin } from '../../core/types';
import { IceScene } from './scene';
export default {
  scenes: [IceScene],
  config: { width: 480, height: 640, pixelArt: true },
} satisfies GamePlugin;
