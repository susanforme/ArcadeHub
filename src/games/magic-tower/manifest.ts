import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'magic-tower',
  addedAt: 1792049629000,
  name: 'games.magicTower.name',
  subtitle: 'games.magicTower.subtitle',
  description: 'games.magicTower.description',
  category: 'categories.puzzle',
  cover,
  source: 'https://github.com/ckcz123/mota-js',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'controls.move' },
    { key: 'Z / B', description: 'games.magicTower.undo' },
    { key: 'B / A', description: 'games.magicTower.book' },
    { key: 'R / X', description: 'games.magicTower.retry' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    directionMode: 'four-way',
    buttons: [
      { id: 'A', action: 'MODE', label: 'games.magicTower.book' },
      { id: 'B', action: 'SPECIAL', label: 'games.magicTower.undo' },
    ],
    opacity: 0.4,
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
