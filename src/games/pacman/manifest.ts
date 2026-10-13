import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'pacman',
  name: '吃豆人',
  subtitle: 'PAC-MAN',
  category: '街机',
  cover,
  description:
    '经典蓝色迷宫，熟悉的黄色身影。吃光豆子，避开四只幽灵；吃下能量豆，反过来追逐它们，逐关刷新纪录。',
  controls: [
    { key: '↑ ↓ ← → / WASD', description: '转向（可提前输入）' },
    { key: '滑动画面', description: '朝滑动方向转向' },
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
