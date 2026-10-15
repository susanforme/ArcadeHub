import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'defender',
  addedAt: 1791947706000,
  name: 'games.defender.name',
  subtitle: 'games.defender.subtitle',
  description: 'games.defender.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('defender'),
  controls: [
    {
      key: 'controls.arrowKeys',
      description: 'controls.moveShip',
    },
    {
      key: 'Space',
      description: 'controls.laser',
    },
    {
      key: 'D / Z',
      description: 'controls.smartBomb',
    },
    {
      key: 'H',
      description: 'controls.hyperspace',
    },
    {
      key: 'A',
      description: 'controls.reverse',
    },
    {
      key: 'Shift',
      description: 'controls.thrust',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
