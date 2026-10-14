import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'gold-miner',
  name: 'games.gold-miner.name',
  subtitle: 'games.gold-miner.subtitle',
  description: 'games.gold-miner.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    {
      key: 'Space / ↓ / S / Enter',
      description: 'games.gold-miner.dropControl',
    },
    { key: '↑ / W', description: 'games.gold-miner.blastControl' },
    { key: '1 / 2 / 3', description: 'games.gold-miner.shopControl' },
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.gold-miner.touchControl',
    },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.gold-miner.drop' },
      { id: 'B', action: 'UP', label: 'games.gold-miner.dynamite' },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
