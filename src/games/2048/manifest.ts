import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: '2048',
  name: 'games.2048.name',
  subtitle: 'games.2048.name',
  category: 'categories.puzzle',
  cover,
  description: 'games.2048.description',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'controls.moveAllTiles' },
    { key: 'controls.swipeTheScreen', description: 'controls.swipeToMove' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
