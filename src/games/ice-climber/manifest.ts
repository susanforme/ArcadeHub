import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'ice-climber',
  name: 'games.iceClimber.name',
  subtitle: 'games.iceClimber.subtitle',
  description: 'games.iceClimber.description',
  category: 'categories.arcade',
  cover,
  localPlayers: 2,
  source: 'https://github.com/albertnadal/IceClimberClone',
  controls: [
    { key: '← → / ↑ / Space / J', description: 'games.iceClimber.player1' },
    { key: '2 · A D / W / F', description: 'games.iceClimber.player2' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      { id: 'A', action: 'UP', label: 'games.iceClimber.jump' },
      { id: 'B', action: 'DROP', label: 'games.iceClimber.hit' },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'UP', label: 'games.iceClimber.jump', symbol: 'B' },
    { action: 'DROP', label: 'games.iceClimber.hit', symbol: 'A' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
