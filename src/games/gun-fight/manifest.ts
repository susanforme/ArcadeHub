import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'gun-fight',
  name: 'games.gun-fight.name',
  subtitle: 'games.gun-fight.subtitle',
  description: 'games.gun-fight.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('gun-fight'),
  controls: [
    {
      key: 'WASD / Q E / F',
      description: 'controls.p1MoveAimFire',
    },
    {
      key: 'controls.playerTwoAimKeys',
      description: 'controls.p2MoveAimFire',
    },
    {
      key: 'M',
      description: 'controls.switch12Players',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
  localPlayers: 2,
} satisfies GameManifest;
