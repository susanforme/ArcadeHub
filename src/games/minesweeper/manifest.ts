import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'minesweeper',
  name: 'games.minesweeper.name',
  subtitle: 'games.minesweeper.subtitle',
  description: 'games.minesweeper.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.minesweeper.revealControl',
    },
    {
      key: 'games.minesweeper.rightClick',
      description: 'games.minesweeper.flagControl',
    },
    {
      key: '↑ ↓ ← → / Enter / F',
      description: 'games.minesweeper.keyboardControl',
    },
    { key: 'R / Z', description: 'games.minesweeper.toolsControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
