import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'bejeweled',
  addedAt: 1792043931000,
  name: 'games.bejeweled.name',
  subtitle: 'games.bejeweled.subtitle',
  description: 'games.bejeweled.description',
  category: 'categories.puzzle',
  cover,
  source: 'https://github.com/AfonsoCFonseca/Bejeweled-Game',
  controls: [
    { key: 'controls.clickTapTheScreen', description: 'games.bejeweled.touch' },
    { key: '↑ ↓ ← → / Enter / Space', description: 'games.bejeweled.keyboard' },
    { key: 'H', description: 'games.bejeweled.hint' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
