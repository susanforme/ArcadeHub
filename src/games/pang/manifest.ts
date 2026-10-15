import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';

export default {
  id: 'pang',
  addedAt: 1792047445000,
  name: 'games.pang.name',
  subtitle: 'games.pang.subtitle',
  description: 'games.pang.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/ray77/pang-web',
  controls: [
    { key: '← / → / A / D', description: 'games.pang.move' },
    { key: '↑ / ↓ / W / S', description: 'games.pang.climb' },
    { key: 'Space / Z / C', description: 'games.pang.fire' },
    { key: 'controls.clickTapTheScreen', description: 'games.pang.touch' },
    { key: 'Enter', description: 'games.pang.start' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'UP', 'DOWN'],
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.pang.fire', color: '#ed7647' },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
