import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'pacman',
  name: 'games.pacman.name',
  subtitle: 'games.pacman.subtitle',
  category: 'categories.arcade',
  cover,
  description: 'games.pacman.description',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'controls.turnBufferedInput' },
    { key: 'controls.swipeTheScreen', description: 'controls.swipeToTurn' },
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
