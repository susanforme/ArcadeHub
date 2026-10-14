import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'bomberman',
  name: 'games.bomberman.name',
  subtitle: 'games.bomberman.subtitle',
  description: 'games.bomberman.description',
  category: 'categories.arcade',
  localPlayers: 2,
  cover,
  source: 'https://github.com/danielcspaiva/Bomberman-Clone',
  controls: [
    { key: '↑ / ↓', description: 'games.bomberman.selectMode' },
    { key: 'Enter', description: 'controls.startRestart' },
    { key: '← ↑ → ↓ / Space', description: 'games.bomberman.p1Controls' },
    { key: 'W A S D / Q', description: 'games.bomberman.p2Controls' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.bomberman.bomb' },
      { id: 'B', action: 'MODE', label: 'games.bomberman.mode' },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
