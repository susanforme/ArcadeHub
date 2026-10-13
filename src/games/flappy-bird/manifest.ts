import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'flappy-bird',
  name: 'Flappy Bird',
  subtitle: 'FLAPPY BIRD',
  category: '街机',
  cover,
  description:
    '轻轻一拍，飞得更远。让小鸟穿过管道之间的空隙，掌握振翅的节奏，挑战你的最高纪录。',
  controls: [
    { key: 'Space / ↑ / W', description: '开始 / 振翅' },
    { key: '点击 / 轻触画面', description: '开始 / 振翅' },
    { key: 'P / Esc', description: '暂停游戏' },
  ],
  touchControls: [{ action: 'UP', label: '振翅', symbol: '振翅' }],
  load: () => import('./index'),
} satisfies GameManifest;
