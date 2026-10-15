import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'missile-command',
  addedAt: 1791947706000,
  name: 'games.missile-command.name',
  subtitle: 'games.missile-command.subtitle',
  description: 'games.missile-command.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('missile-command'),
  controls: [
    {
      key: 'controls.mouse',
      description: 'controls.aim',
    },
    {
      key: '1 / 2 / 3',
      description: 'controls.fireLeftCenterRightBattery',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
