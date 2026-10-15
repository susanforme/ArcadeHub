import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'ns-shaft',
  addedAt: 1792047445000,
  name: 'games.nsShaft.name',
  subtitle: 'games.nsShaft.subtitle',
  description: 'games.nsShaft.description',
  category: 'categories.arcade',
  cover,
  source: 'https://github.com/mitty-fun/NS-Shaft-Tutorial',
  controls: [
    { key: '← / → / A / D', description: 'games.nsShaft.move' },
    { key: 'controls.clickTapTheScreen', description: 'games.nsShaft.touch' },
    { key: 'Enter / Space', description: 'games.nsShaft.start' },
    { key: 'P / Esc', description: 'controls.pauseGame' },
  ],
  virtualGamepad: { directions: ['LEFT', 'RIGHT'], buttons: [] },
  touchControls: [],
  load: () => import('./index'),
} satisfies GameManifest;
