import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'computer-space',
  addedAt: 1791947706000,
  name: 'games.computer-space.name',
  subtitle: 'games.computer-space.subtitle',
  description: 'games.computer-space.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('computer-space'),
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
      key: 'Space',
      description: 'controls.fireMissile',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
