import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 'battle-city',
  name: '坦克大战',
  subtitle: 'BATTLE CITY',
  category: '街机',
  localPlayers: 2,
  cover,
  description:
    '驾驶坦克守护基地，击退敌军。35 个经典关卡、六种道具，支持单人和同屏双人。继续游戏从当前关卡开局恢复。',
  controls: [
    {
      key: 'W A S D / 方向键',
      description: '单人移动；双人时 WASD 为玩家 1，方向键为玩家 2',
    },
    { key: 'J / Space', description: '玩家 1 开火（可按住）/ 菜单确认' },
    { key: '/ / Enter', description: '玩家 2 开火 / 菜单确认' },
    { key: 'P / Esc', description: '暂停游戏' },
  ],
  virtualGamepad: {
    directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
    buttons: [{ id: 'A', action: 'DROP', label: '开火 / 确认' }],
  },
  touchControls: [
    { action: 'UP', label: '向上', symbol: '↑' },
    { action: 'LEFT', label: '向左', symbol: '←' },
    { action: 'DOWN', label: '向下', symbol: '↓' },
    { action: 'RIGHT', label: '向右', symbol: '→' },
    { action: 'DROP', label: '开火 / 确认', symbol: '●' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
