import type { GamePlugin } from '../../core/types';
import { FeedingScene } from './Scene';
export default {
  scenes: [FeedingScene],
  config: { width: 600, height: 780 },
} satisfies GamePlugin;
