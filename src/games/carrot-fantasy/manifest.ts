import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'carrot-fantasy',
  addedAt: 1791963212000,
  name: 'games.carrot-fantasy.name',
  subtitle: 'games.carrot-fantasy.subtitle',
  description: 'games.carrot-fantasy.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/JezaChen/CarrotGuardGame',
  controls: [
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.carrot-fantasy.touchControl',
    },
    { key: 'Enter / Space', description: 'games.carrot-fantasy.startControl' },
    { key: 'F', description: 'games.carrot-fantasy.speedControl' },
    { key: 'R / L', description: 'games.carrot-fantasy.menuControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
