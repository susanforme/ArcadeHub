import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: '2048',
  addedAt: 1791877141000,
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
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
