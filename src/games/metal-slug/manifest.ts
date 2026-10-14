import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';
export default {
  id: 'metal-slug',
  name: 'games.metal-slug.name',
  subtitle: 'games.metal-slug.subtitle',
  description: 'games.metal-slug.description',
  category: 'categories.arcade',
  source: 'https://github.com/giacoballoccu/MetalSlugClone',
  cover,
  controls: [
    { key: '← → / A D', description: 'controls.move' },
    { key: '↑ ↓ / W S', description: 'games.metal-slug.aim' },
    { key: 'J / X', description: 'games.metal-slug.fire' },
    { key: 'Space / K', description: 'games.metal-slug.jump' },
    { key: 'L / C', description: 'games.metal-slug.grenade' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT', 'UP', 'DOWN'],
    directionMode: 'eight-way',
    buttons: [
      { id: 'A', action: 'DROP', label: 'games.metal-slug.shoot' },
      { id: 'B', action: 'SECONDARY', label: 'games.metal-slug.jump' },
      { id: 'X', action: 'SPECIAL', label: 'games.metal-slug.grenade' },
    ],
    layout: {
      landscape: {
        dpad: { anchor: 'bottom-left', x: 18, y: 18, size: 132 },
        A: { anchor: 'bottom-right', x: 20, y: 22, size: 62 },
        B: { anchor: 'bottom-right', x: 96, y: 18, size: 58 },
        X: { anchor: 'bottom-right', x: 40, y: 102, size: 52 },
      },
    },
  },
  touchControls: [
    { action: 'LEFT', label: 'controls.left', symbol: '←' },
    { action: 'RIGHT', label: 'controls.right', symbol: '→' },
    { action: 'UP', label: 'controls.up', symbol: '↑' },
    { action: 'DOWN', label: 'controls.down', symbol: '↓' },
    { action: 'DROP', label: 'games.metal-slug.shoot', symbol: 'A' },
    { action: 'SECONDARY', label: 'games.metal-slug.jump', symbol: 'B' },
    { action: 'SPECIAL', label: 'games.metal-slug.grenade', symbol: 'X' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
