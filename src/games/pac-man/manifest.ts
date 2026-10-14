import type { GameManifest } from '../../core/types';
import { controllerFor } from '../browser-arcade/controls';
import cover from './cover.png';

export default {
  id: 'pac-man',
  name: 'games.pac-man.name',
  subtitle: 'games.pac-man.subtitle',
  description: 'games.pac-man.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/juliensimon/browser-games',
  load: () => import('./index'),
  virtualGamepad: controllerFor('pac-man'),
  controls: [
    {
      key: 'controls.arrowKeysWasd',
      description: 'controls.move',
    },
    {
      key: 'Enter',
      description: 'controls.startRestart',
    },
  ],
  touchControls: [],
} satisfies GameManifest;
