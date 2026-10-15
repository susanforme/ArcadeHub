import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'snake',
  addedAt: 1791863095000,
  name: 'games.snake.name',
  subtitle: 'games.snake.subtitle',
  category: 'categories.arcade',
  cover,
  description: 'games.snake.description',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'controls.changeDirection' },
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
