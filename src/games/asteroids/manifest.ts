import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'asteroids',
  name: 'games.asteroids.name',
  subtitle: 'games.asteroids.subtitle',
  description: 'games.asteroids.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('asteroids'),
  controls: [
    {
      key: '← →',
      description: 'controls.rotate',
    },
    {
      key: '↑',
      description: 'controls.thrust',
    },
    {
      key: 'Space',
      description: 'controls.fire',
    },
    {
      key: 'Shift',
      description: 'controls.hyperspace',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
