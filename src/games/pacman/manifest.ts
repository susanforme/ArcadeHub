import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'pacman',
  addedAt: 1791879409000,
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
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
