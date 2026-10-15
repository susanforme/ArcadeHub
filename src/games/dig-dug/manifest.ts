import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'dig-dug',
  addedAt: 1792049629000,
  name: 'games.digDug.name',
  subtitle: 'games.digDug.subtitle',
  description: 'games.digDug.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/lazyleung/DigDugJS',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'games.digDug.move' },
    { key: 'Space / J / Click', description: 'games.digDug.pump' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    buttons: [{ id: 'A', action: 'DROP', label: 'games.digDug.pump' }],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'DROP', label: 'games.digDug.pump', symbol: 'A' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
