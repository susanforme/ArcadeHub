import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'snow-bros',
  addedAt: 1792046782000,
  name: 'games.snowBros.name',
  subtitle: 'games.snowBros.subtitle',
  description: 'games.snowBros.description',
  category: 'categories.arcade',
  localPlayers: 1,
  cover,
  controls: [
    { key: '← / → / A / D', description: 'games.snowBros.move' },
    { key: 'J / X', description: 'games.snowBros.fire' },
    { key: 'Space / K / ↑', description: 'games.snowBros.jump' },
    { key: 'Enter', description: 'games.snowBros.start' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      {
        id: 'A',
        action: 'DROP',
        label: 'games.snowBros.fire',
        color: '#68d8f3',
      },
      {
        id: 'B',
        action: 'SECONDARY',
        label: 'games.snowBros.jump',
        color: '#f4b457',
      },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'DROP', label: 'games.snowBros.fire', symbol: 'A' },
    { action: 'SECONDARY', label: 'games.snowBros.jump', symbol: 'B' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
