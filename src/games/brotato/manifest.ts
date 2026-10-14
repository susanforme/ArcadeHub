import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'brotato',
  name: 'games.brotato.name',
  subtitle: 'games.brotato.subtitle',
  description: 'games.brotato.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: 'WASD / ↑ ↓ ← →', description: 'games.brotato.moveControl' },
    { key: '1 / 2 / 3 / 4', description: 'games.brotato.menuControl' },
    { key: 'Space / Enter', description: 'games.brotato.nextControl' },
    { key: 'R', description: 'games.brotato.rerollControl' },
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.brotato.touchControl',
    },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'UP', 'DOWN'],
    directionMode: 'eight-way',
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.brotato.choose' },
      { id: 'B', action: 'REVERSE', label: 'games.brotato.rerollControl' },
    ],
    opacity: 0.5,
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
