import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'tetris',
  name: '俄罗斯方块',
  subtitle: 'TETRIS',
  category: '益智',
  cover,
  description:
    '让每一块都有自己的位置。旋转、移动、消除整行，在越来越快的节奏中找到秩序。',
  controls: [
    { key: '← → / A D', description: '左右移动' },
    { key: '↑ / W', description: '旋转方块' },
    { key: '↓ / S', description: '加速下落' },
    { key: 'Space', description: '直接落底' },
    { key: 'P / Esc', description: '暂停游戏' },
  ],
  touchControls: [
    { action: 'LEFT', label: '向左', symbol: '←' },
    { action: 'UP', label: '旋转', symbol: '↻' },
    { action: 'DOWN', label: '向下', symbol: '↓' },
    { action: 'RIGHT', label: '向右', symbol: '→' },
    { action: 'DROP', label: '落底', symbol: '落底' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
