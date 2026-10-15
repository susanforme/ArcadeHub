import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'whack-a-mole',
  addedAt: 1792034021000,
  name: 'games.whackAMole.name',
  subtitle: 'games.whackAMole.subtitle',
  description: 'games.whackAMole.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: 'controls.clickTapTheScreen', description: 'games.whackAMole.tap' },
    { key: '1 2 3 / 4 5 6 / 7 8 9', description: 'games.whackAMole.keys' },
    { key: 'Q W E / A S D / Z X C', description: 'games.whackAMole.keys' },
    { key: 'Enter / Space', description: 'games.whackAMole.continue' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
