import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'dr-mario',
  addedAt: 1792047445000,
  name: 'games.drMario.name',
  subtitle: 'games.drMario.subtitle',
  description: 'games.drMario.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    { key: '← → / A D', description: 'games.drMario.moveControl' },
    { key: '↓ / S', description: 'games.drMario.dropControl' },
    { key: '↑ / X / Space / A', description: 'games.drMario.rotateRight' },
    { key: 'Z / B', description: 'games.drMario.rotateLeft' },
    { key: 'Enter / A', description: 'games.drMario.startControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'DOWN'],
    directionMode: 'four-way',
    buttons: [
      { id: 'A', action: 'START', label: 'games.drMario.rotateRight' },
      { id: 'B', action: 'SPECIAL', label: 'games.drMario.rotateLeft' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'DOWN', label: 'games.drMario.dropControl', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'SPECIAL', label: 'games.drMario.rotateLeft', symbol: '↶' },
    { action: 'START', label: 'games.drMario.rotateRight', symbol: '↷' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
