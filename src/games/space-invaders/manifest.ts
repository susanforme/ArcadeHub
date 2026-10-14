import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'space-invaders',
  name: 'games.space-invaders.name',
  subtitle: 'games.space-invaders.subtitle',
  description: 'games.space-invaders.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('space-invaders'),
  controls: [
    {
      key: '← → / A D',
      description: 'controls.moveCannon',
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
