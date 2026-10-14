import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'cut-the-rope',
  name: 'games.cut-the-rope.name',
  subtitle: 'games.cut-the-rope.subtitle',
  description: 'games.cut-the-rope.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.cut-the-rope.swipeControl',
    },
    { key: 'R', description: 'games.cut-the-rope.retry' },
    { key: 'L', description: 'games.cut-the-rope.levels' },
    { key: 'Enter', description: 'games.cut-the-rope.nextControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
