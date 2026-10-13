import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'snake',
  name: '贪吃蛇',
  subtitle: 'SNAKE',
  category: '街机',
  cover,
  description:
    '一颗食物，一点成长。控制小蛇吃掉食物，避开墙壁和自己，看看你的反应能走多远。',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: '改变方向' },
    { key: 'P / Esc', description: '暂停游戏' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
  },
  touchControls: [
    { action: 'LEFT', label: '向左', symbol: '←' },
    { action: 'UP', label: '向上', symbol: '↑' },
    { action: 'DOWN', label: '向下', symbol: '↓' },
    { action: 'RIGHT', label: '向右', symbol: '→' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
