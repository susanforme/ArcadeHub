import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'feeding-frenzy',
  addedAt: 1792049629000,
  name: 'games.feedingFrenzy.name',
  subtitle: 'games.feedingFrenzy.subtitle',
  description: 'games.feedingFrenzy.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: '↔ / Touch', description: 'games.feedingFrenzy.controls' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
