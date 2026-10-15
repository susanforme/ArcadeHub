import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'zuma',
  addedAt: 1792036336000,
  name: 'games.zuma.name',
  subtitle: 'games.zuma.subtitle',
  description: 'games.zuma.description',
  category: 'categories.puzzle',
  cover,
  source: 'https://github.com/19nkn80/Zuma-Deluxe-HD',
  controls: [
    { key: 'controls.clickTapTheScreen', description: 'games.zuma.pointer' },
    { key: '← → / A D', description: 'games.zuma.aim' },
    { key: 'Space / Enter', description: 'games.zuma.fire' },
    { key: 'X / RMB', description: 'games.zuma.swap' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
