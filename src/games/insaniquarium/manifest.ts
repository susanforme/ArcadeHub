import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'insaniquarium',
  addedAt: 1792049629000,
  name: 'games.insaniquarium.name',
  subtitle: 'games.insaniquarium.subtitle',
  description: 'games.insaniquarium.description',
  category: 'categories.arcade',
  cover,
  controls: [
    { key: '↔ / Touch', description: 'games.insaniquarium.controls' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
