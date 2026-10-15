import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'fruit-ninja',
  addedAt: 1792034021000,
  name: 'games.fruitNinja.name',
  subtitle: 'games.fruitNinja.subtitle',
  description: 'games.fruitNinja.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/ChineseDron/fruit-ninja',
  controls: [
    { key: 'games.fruitNinja.gesture', description: 'games.fruitNinja.slice' },
    { key: 'Enter / Space', description: 'games.fruitNinja.startControl' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
