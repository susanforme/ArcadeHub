import type { GamePlugin } from '../../core/types';
import { DigScene } from './scene';
export default {
  scenes: [DigScene],
  config: { width: 450, height: 640, pixelArt: true },
} satisfies GamePlugin;
