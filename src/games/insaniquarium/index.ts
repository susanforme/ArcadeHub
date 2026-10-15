import type { GamePlugin } from '../../core/types';
import { AquariumScene } from './Scene';
export default {
  scenes: [AquariumScene],
  config: { width: 600, height: 780 },
} satisfies GamePlugin;
