import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'fireboy-watergirl',
  name: 'games.fireboy-watergirl.name',
  subtitle: 'games.fireboy-watergirl.subtitle',
  description: 'games.fireboy-watergirl.description',
  category: 'categories.puzzle',
  cover,
  localPlayers: 2,
  controls: [
    {
      key: '← / → / ↑ / ↓',
      description: 'games.fireboy-watergirl.fireControls',
    },
    {
      key: 'A / D / W / S',
      description: 'games.fireboy-watergirl.waterControls',
    },
    { key: 'Q / X', description: 'games.fireboy-watergirl.switchControl' },
    { key: 'Enter / Space / Y', description: 'controls.startRestart' },
    { key: 'R', description: 'games.fireboy-watergirl.retry' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      { id: 'A', action: 'UP', label: 'games.fireboy-watergirl.jump' },
      {
        id: 'B',
        action: 'SECONDARY',
        label: 'games.fireboy-watergirl.interact',
      },
      {
        id: 'X',
        action: 'MODE',
        label: 'games.fireboy-watergirl.switch',
        color: '#386e75',
      },
      {
        id: 'Y',
        action: 'DROP',
        label: 'games.fireboy-watergirl.continue',
        color: '#6b6241',
      },
    ],
    layout: {
      portrait: {
        dpad: { anchor: 'bottom-left', x: 12, y: 12, size: 110 },
        A: { anchor: 'bottom-right', x: 76, y: 12, size: 54 },
        B: { anchor: 'bottom-right', x: 12, y: 12, size: 54 },
        X: { anchor: 'bottom-left', x: 12, y: 134, size: 48 },
        Y: { anchor: 'bottom-right', x: 12, y: 80, size: 48 },
      },
      landscape: {
        dpad: { anchor: 'bottom-left', x: 12, y: 12, size: 110 },
        A: { anchor: 'bottom-right', x: 76, y: 12, size: 54 },
        B: { anchor: 'bottom-right', x: 12, y: 12, size: 54 },
        X: { anchor: 'bottom-left', x: 12, y: 134, size: 48 },
        Y: { anchor: 'bottom-right', x: 12, y: 80, size: 48 },
      },
    },
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
