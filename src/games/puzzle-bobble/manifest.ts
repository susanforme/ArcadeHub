import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'puzzle-bobble',
  addedAt: 1792034021000,
  name: 'games.puzzleBobble.name',
  subtitle: 'games.puzzleBobble.subtitle',
  category: 'categories.puzzle',
  cover,
  description: 'games.puzzleBobble.description',
  source: 'https://github.com/carcasanchez/Puzzle-Bobble',
  controls: [
    { key: '← → / A D', description: 'games.puzzleBobble.aim' },
    { key: 'Space / ↑ / Enter', description: 'games.puzzleBobble.fire' },
    { key: 'X', description: 'games.puzzleBobble.swap' },
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.puzzleBobble.pointer',
    },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      {
        id: 'A',
        action: 'DROP',
        label: 'games.puzzleBobble.fire',
        color: '#f7cb62',
      },
      {
        id: 'B',
        action: 'SPECIAL',
        label: 'games.puzzleBobble.swap',
        color: '#79c7e8',
      },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
