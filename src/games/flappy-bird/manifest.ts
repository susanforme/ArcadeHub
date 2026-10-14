import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'flappy-bird',
  name: 'games.flappy-bird.name',
  subtitle: 'games.flappy-bird.subtitle',
  category: 'categories.arcade',
  cover,
  description: 'games.flappy-bird.description',
  controls: [
    { key: 'Space / ↑ / W', description: 'controls.startFlap' },
    { key: 'controls.clickTapTheScreen', description: 'controls.startFlap' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    buttons: [{ id: 'A', action: 'UP', label: 'controls.flap' }],
  },
  touchControls: [
    { action: 'UP', label: 'controls.flap', symbol: 'controls.flap' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
