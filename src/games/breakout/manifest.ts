import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'breakout',
  addedAt: 1791947706000,
  name: 'games.breakout.name',
  subtitle: 'games.breakout.subtitle',
  description: 'games.breakout.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('breakout'),
  controls: [
    {
      key: '← → / A D',
      description: 'controls.movePaddle',
    },
    {
      key: 'Enter / Space',
      description: 'controls.startServe',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
