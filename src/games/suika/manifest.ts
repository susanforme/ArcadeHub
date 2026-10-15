import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'suika',
  addedAt: 1792049629000,
  name: 'games.suika.name',
  subtitle: 'games.suika.subtitle',
  description: 'games.suika.description',
  category: 'categories.puzzle',
  cover,
  source: 'https://github.com/kairess/suika-game',
  controls: [
    { key: '← / → / A / D', description: 'games.suika.move' },
    { key: 'Space / Enter', description: 'games.suika.drop' },
    { key: 'controls.clickTapTheScreen', description: 'games.suika.touch' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.suika.drop', color: '#eb9850' },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
