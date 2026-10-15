import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'ski-free',
  addedAt: 1792049629000,
  name: 'games.skiFree.name',
  subtitle: 'games.skiFree.subtitle',
  description: 'games.skiFree.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: '↔ / Touch', description: 'games.skiFree.controls' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
