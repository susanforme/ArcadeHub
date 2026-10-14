import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'galaxian',
  name: 'games.galaxian.name',
  subtitle: 'games.galaxian.subtitle',
  description: 'games.galaxian.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('galaxian'),
  controls: [
    {
      key: '← → / A D',
      description: 'controls.moveShip',
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
