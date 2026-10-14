import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'battle-city',
  name: 'games.battle-city.name',
  subtitle: 'games.battle-city.subtitle',
  category: 'categories.arcade',
  localPlayers: 2,
  cover,
  description: 'games.battle-city.description',
  controls: [
    {
      key: 'controls.wASDArrowKeys',
      description:
        'controls.moveIn2PlayerModeWasdControlsP1AndArrowKeysControlP2',
    },
    { key: 'J / Space', description: 'controls.p1FireHoldConfirmMenu' },
    { key: '/ / Enter', description: 'controls.p2FireConfirmMenu' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    buttons: [{ id: 'A', action: 'DROP', label: 'controls.fireConfirm' }],
  },
  touchControls: [
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'DROP', label: 'controls.fireConfirm', symbol: '●' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
