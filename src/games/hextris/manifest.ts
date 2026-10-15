import type { GameManifest } from '../../core/types';
import cover from './assets/cover.png';

export default {
  id: 'hextris',
  addedAt: 1792047445000,
  name: 'games.hextris.name',
  subtitle: 'games.hextris.subtitle',
  description: 'games.hextris.description',
  category: 'categories.puzzle',
  cover,
  source: '/sources/arcadehub.tar.gz',
  controls: [
    { key: '← → / A D', description: 'games.hextris.rotate' },
    { key: '↓ / S / Space', description: 'games.hextris.fast' },
    { key: 'controls.clickTapTheScreen', description: 'games.hextris.touch' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [{ id: 'A', action: 'DOWN', label: 'games.hextris.fast' }],
  },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
