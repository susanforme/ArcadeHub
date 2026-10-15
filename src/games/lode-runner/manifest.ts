import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'lode-runner',
  addedAt: 1792047445000,
  name: 'games.lodeRunner.name',
  subtitle: 'games.lodeRunner.subtitle',
  description: 'games.lodeRunner.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/SimonHung/LodeRunner_TotalRecall',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'games.lodeRunner.move' },
    { key: 'Z / J', description: 'games.lodeRunner.digLeft' },
    { key: 'X / K / Space', description: 'games.lodeRunner.digRight' },
    { key: 'Enter', description: 'games.lodeRunner.start' },
    { key: 'R', description: 'games.lodeRunner.retry' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.lodeRunner.digRight' },
      { id: 'B', action: 'SPECIAL', label: 'games.lodeRunner.digLeft' },
      { id: 'X', action: 'SECONDARY', label: 'games.lodeRunner.retryShort' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'SPECIAL', label: 'games.lodeRunner.digLeft', symbol: '↙' },
    { action: 'DROP', label: 'games.lodeRunner.digRight', symbol: '↘' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
