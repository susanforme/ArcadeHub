import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: '2048',
  name: '2048',
  subtitle: '2048',
  category: '益智',
  cover,
  description:
    '滑动、合并、再想一步。让相同数字碰在一起，从 2 开始，一步步拼出属于你的 2048。',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: '移动全部方块' },
    { key: '滑动画面', description: '朝滑动方向移动' },
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
