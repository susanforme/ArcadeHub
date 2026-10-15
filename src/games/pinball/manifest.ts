import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'pinball',
  name: 'games.pinball.name',
  subtitle: 'games.pinball.subtitle',
  description: 'games.pinball.description',
  category: 'categories.arcade',
  cover,
  source: 'https://opengameart.org/content/2d-pinball-sprites',
  controls: [
    { key: '← / A', description: 'games.pinball.left' },
    { key: '→ / D', description: 'games.pinball.right' },
    { key: 'Space / Enter', description: 'games.pinball.launch' },
    { key: 'controls.clickTapTheScreen', description: 'games.pinball.touch' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [
      {
        id: 'A',
        action: 'DROP',
        label: 'games.pinball.launch',
        color: '#d95478',
      },
    ],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
