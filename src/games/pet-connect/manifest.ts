import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'pet-connect',
  name: 'games.petConnect.name',
  subtitle: 'games.petConnect.subtitle',
  category: 'categories.puzzle',
  cover,
  description: 'games.petConnect.description',
  controls: [
    {
      key: 'controls.clickTapTheScreen',
      description: 'games.petConnect.select',
    },
    { key: '↑ ↓ ← → / Enter', description: 'games.petConnect.keyboard' },
    { key: 'H / R', description: 'games.petConnect.tools' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
