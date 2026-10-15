import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'flappy-bird',
  addedAt: 1791863095000,
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
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
