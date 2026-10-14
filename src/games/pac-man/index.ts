import type { GamePlugin } from '../../core/types';
import { arcadeScene } from '../browser-arcade/scene';
import engine from './vendor/engine';
export default {
  scenes: [arcadeScene('pac-man', engine)],
  config: engine.config,
} satisfies GamePlugin;
