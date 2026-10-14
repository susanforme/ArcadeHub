import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'tetris',
  name: 'games.tetris.name',
  subtitle: 'games.tetris.subtitle',
  category: 'categories.puzzle',
  cover,
  description: 'games.tetris.description',
  controls: [
    { key: '← → / A D', description: 'controls.moveLeftRight' },
    { key: '↑ / W', description: 'controls.rotatePiece' },
    { key: '↓ / S', description: 'controls.softDrop' },
    { key: 'Space', description: 'controls.hardDrop' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'DOWN'],
    buttons: [
      { id: 'A', action: 'UP', label: 'controls.rotate' },
      { id: 'B', action: 'DROP', label: 'controls.drop' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'UP', label: 'controls.rotate', symbol: '↻' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'DROP', label: 'controls.drop', symbol: 'controls.drop' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
