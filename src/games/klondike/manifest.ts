import type { GameManifest } from '../../core/types';
import cover from './assets/cards.png';
export default {
  id: 'klondike',
  name: 'games.klondike.name',
  subtitle: 'games.klondike.subtitle',
  description: 'games.klondike.description',
  category: 'categories.puzzle',
  cover,
  controls: [
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.klondike.pointer',
    },
    { key: '← ↑ ↓ → / Enter', description: 'games.klondike.keyboard' },
    { key: 'Space / Z / H / F', description: 'games.klondike.shortcuts' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
