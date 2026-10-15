import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'doodle-jump',
  addedAt: 1792036714000,
  name: 'games.doodleJump.name',
  subtitle: 'games.doodleJump.subtitle',
  description: 'games.doodleJump.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: '← / → / A / D', description: 'games.doodleJump.move' },
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.doodleJump.touch',
    },
    { key: 'Enter / Space', description: 'games.doodleJump.startControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: { directions: ['LEFT', 'RIGHT'], buttons: [] },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
