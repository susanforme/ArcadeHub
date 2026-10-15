import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'centipede',
  addedAt: 1791947706000,
  name: 'games.centipede.name',
  subtitle: 'games.centipede.subtitle',
  description: 'games.centipede.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('centipede'),
  controls: [
    {
      key: 'controls.arrowKeysWasd',
      description: 'controls.move',
    },
    {
      key: 'Space',
      description: 'controls.fire',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
