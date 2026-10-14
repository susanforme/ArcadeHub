import type { GamePlugin } from '../../core/types';
import { arcadeScene } from '../browser-arcade/scene';
import engine from './vendor/engine';
export default {
  scenes: [arcadeScene('centipede', engine)],
  config: engine.config,
} satisfies GamePlugin;
