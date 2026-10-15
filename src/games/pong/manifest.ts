import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'pong',
  addedAt: 1791947706000,
  name: 'games.pong.name',
  subtitle: 'games.pong.subtitle',
  description: 'games.pong.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('pong'),
  controls: [
    {
      key: 'W S / ↑ ↓',
      description: 'controls.movePaddle',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
