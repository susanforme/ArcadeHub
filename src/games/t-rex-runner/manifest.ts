import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 't-rex-runner',
  addedAt: 1791877141000,
  name: 'games.t-rex-runner.name',
  subtitle: 'games.t-rex-runner.subtitle',
  category: 'categories.arcade',
  cover,
  description: 'games.t-rex-runner.description',
  controls: [
    { key: 'Space / ↑ / W', description: 'controls.startJumpHoldForHigher' },
    { key: '↓ / S', description: 'controls.duckFastFall' },
    { key: 'controls.clickTapTheScreen', description: 'controls.startJump' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    layout: {
      portrait: {
        A: { anchor: 'bottom-right', x: 16, y: 76, size: 60 },
        B: { anchor: 'bottom-left', x: 16, y: 76, size: 60 },
      },
      landscape: {
        A: { anchor: 'bottom-right', x: 24, y: 24, size: 64 },
        B: { anchor: 'bottom-left', x: 24, y: 24, size: 64 },
      },
    },
    buttons: [
      { id: 'A', action: 'UP', label: 'controls.jump' },
      { id: 'B', action: 'DOWN', label: 'controls.duck' },
    ],
  },
  touchControls: [
    { action: 'UP', label: 'controls.jump', symbol: 'controls.jump' },
    { action: 'DOWN', label: 'controls.duck', symbol: 'controls.duck' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
