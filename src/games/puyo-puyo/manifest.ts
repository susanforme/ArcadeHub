import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'puyo-puyo',
  name: 'games.puyoPuyo.name',
  subtitle: 'games.puyoPuyo.subtitle',
  category: 'categories.puzzle',
  description: 'games.puyoPuyo.description',
  cover,
  source: 'https://opengameart.org/content/puyo-puyo-blobs',
  controls: [
    { key: '← → / A D', description: 'controls.moveLeftRight' },
    { key: 'X / E', description: 'games.puyoPuyo.rotateRight' },
    { key: 'Z / Q', description: 'games.puyoPuyo.rotateLeft' },
    { key: '↓ / S', description: 'controls.softDrop' },
    { key: '↑ / W / Space', description: 'controls.hardDrop' },
    { key: 'Enter / Space', description: 'games.puyoPuyo.restartHint' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'DOWN', 'UP'],
    buttons: [
      {
        id: 'A',
        action: 'SPECIAL',
        label: 'games.puyoPuyo.rotateRight',
        color: '#dc718c',
      },
      {
        id: 'B',
        action: 'SECONDARY',
        label: 'games.puyoPuyo.rotateLeft',
        color: '#798cdb',
      },
    ],
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'SPECIAL', label: 'games.puyoPuyo.rotateRight', symbol: '↻' },
    { action: 'SECONDARY', label: 'games.puyoPuyo.rotateLeft', symbol: '↺' },
    { action: 'DOWN', label: 'controls.softDrop', symbol: '↓' },
    { action: 'DROP', label: 'controls.hardDrop', symbol: '⇓' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
