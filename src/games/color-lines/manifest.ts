import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'color-lines',
  name: 'games.colorLines.name',
  subtitle: 'games.colorLines.subtitle',
  description: 'games.colorLines.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    { key: 'Click / Tap', description: 'games.colorLines.selectControl' },
    { key: '↑ ↓ ← → / WASD', description: 'games.colorLines.cursorControl' },
    { key: 'Enter / Space / A', description: 'games.colorLines.selectControl' },
    { key: 'Z / B', description: 'games.colorLines.cancelControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    directionMode: 'four-way',
    buttons: [
      { id: 'A', action: 'START', label: 'games.colorLines.select' },
      { id: 'B', action: 'SPECIAL', label: 'games.colorLines.cancel' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'START', label: 'games.colorLines.select', symbol: '●' },
    { action: 'SPECIAL', label: 'games.colorLines.cancel', symbol: '×' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
