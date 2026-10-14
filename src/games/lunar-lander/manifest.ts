import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'lunar-lander',
  name: 'games.lunar-lander.name',
  subtitle: 'games.lunar-lander.subtitle',
  description: 'games.lunar-lander.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('lunar-lander'),
  controls: [
    {
      key: '← → / A D',
      description: 'controls.rotate',
    },
    {
      key: '↑ / W',
      description: 'controls.thrust',
    },
    {
      key: '↑ ↓',
      description: 'controls.selectMission',
    },
    {
      key: 'Space',
      description: 'controls.abort',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
