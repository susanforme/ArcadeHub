import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'sokoban',
  name: 'games.sokoban.name',
  subtitle: 'games.sokoban.subtitle',
  description: 'games.sokoban.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'games.sokoban.moveControl' },
    { key: 'Z / U / B', description: 'games.sokoban.undo' },
    { key: 'R', description: 'games.sokoban.reset' },
    { key: 'L', description: 'games.sokoban.choose' },
    { key: 'Enter / Space / A', description: 'games.sokoban.nextControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    directionMode: 'four-way',
    buttons: [
      { id: 'A', action: 'START', label: 'games.sokoban.next' },
      { id: 'B', action: 'SPECIAL', label: 'games.sokoban.undo' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'SPECIAL', label: 'games.sokoban.undo', symbol: '↶' },
    { action: 'START', label: 'games.sokoban.next', symbol: '→' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
