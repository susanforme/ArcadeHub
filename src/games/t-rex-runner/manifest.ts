import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';
export default {
  id: 't-rex-runner',
  name: '小恐龙跑酷',
  subtitle: 'T-REX RUNNER',
  category: '街机',
  cover,
  description:
    '熟悉的小恐龙，无尽的奔跑。跳过仙人掌，俯身躲开翼龙，在越来越快的节奏中刷新距离纪录。',
  controls: [
    { key: 'Space / ↑ / W', description: '开始 / 跳跃（按住更高）' },
    { key: '↓ / S', description: '俯身 / 快速落地' },
    { key: '点击 / 轻触画面', description: '开始 / 跳跃' },
    { key: 'P / Esc', description: '暂停游戏' },
  ],
  touchControls: [
    { action: 'UP', label: '跳跃', symbol: '跳跃' },
    { action: 'DOWN', label: '俯身', symbol: '俯身' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;
