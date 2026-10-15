import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'frogger',
  name: 'games.frogger.name',
  subtitle: 'games.frogger.subtitle',
  description: 'games.frogger.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: '↑ ↓ ← → / WASD', description: 'games.frogger.hop' },
    { key: 'Space / Enter', description: 'games.frogger.startControl' },
    { key: 'controls.clickTapTheScreen', description: 'games.frogger.touch' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    directionMode: 'four-way',
    buttons: [{ id: 'A', action: 'DROP', label: 'games.frogger.forward' }],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
