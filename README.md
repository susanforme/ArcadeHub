# ArcadeHub · Web Game Center

基于 Rsbuild 2、React、TypeScript、Phaser 4.2.1 的纯前端游戏插件平台。包含贪吃蛇、俄罗斯方块、Flappy Bird，以及游戏大厅、详情、动态加载、IndexedDB 存档、音效和设置。无账号、无后端。

## 运行

```sh
bun install
bun run dev
bun run check
bun run typecheck
bun run test
bun run build
bun run preview
```

`check` 沿用项目的 Biome 自动修复命令。生产构建结束后生成 `dist/sw.js`，部署整个 `dist` 到静态服务器根路径。正式站点需要 HTTPS（localhost 可直接测试）。

## 结构与边界

- `src/app`：React 大厅、详情、存档、设置、hash 路由、Zustand 本地设置。
- `src/components`：卡片、列表、Canvas 容器与屏幕操作按钮。
- `src/core`：插件类型、自动注册、动态加载、Phaser 生命周期、平台事件、通用游戏会话。
- `src/games/{id}`：manifest、插件入口、纯游戏规则、Phaser Scene、自有资源。
- `src/shared`：Howler 音频、IndexedDB 存储、键盘/触屏/手柄输入。
- `scripts/build-offline.ts`：根据实际构建产物生成带版本的完整离线缓存。

React 不管理角色、动画、碰撞或游戏循环。大厅启动只载入 manifest，点击开始后才加载 Phaser 和对应游戏。游戏默认铺满网页，可切回详情页的小屏，或主动进入浏览器全屏（Esc 退出）。切换显示模式不会重新创建游戏或清空进度。运行环境同一时间只有一个 Phaser.Game；离开时销毁，下一次创建等待销毁完成，快速切换时丢弃过期的异步加载结果。

## 新增游戏

新增 `src/games/new-game/manifest.ts`、`index.ts`、`scenes/`、`assets/` 即可。Rsbuild 2 原生 `import.meta.glob('../games/*/manifest.ts', { eager: true })` 自动发现 manifest，不需要修改注册表、路由或菜单。ID 必须唯一，仅支持小写字母、数字、连字符。manifest 不应直接导入 Scene 或 Phaser。

```ts
// manifest.ts
import type { GameManifest } from '../../core/types';
import cover from './assets/cover.svg';

export default {
  id: 'new-game',
  name: '新游戏',
  subtitle: 'NEW GAME',
  category: '街机',
  cover,
  description: '游戏介绍',
  controls: [{ key: '← →', description: '移动' }],
  touchControls: [
    { action: 'LEFT', label: '向左', symbol: '←' },
    { action: 'RIGHT', label: '向右', symbol: '→' },
  ],
  load: () => import('./index'),
} satisfies GameManifest;

// index.ts
import type { GamePlugin } from '../../core/types';
import { MainScene } from './scenes/MainScene';

export default {
  scenes: [MainScene],
  config: { width: 480, height: 480 },
} satisfies GamePlugin;
```

所有 Scene 注册到 Phaser，第一项自动启动，其余可通过 SceneManager 切换；注册 key 为 `${id}-${index}`。继承 `SessionScene` 可复用暂停、得分通知与存档：在 `create()` 还原并验证 `savedSnapshot`，调用 `begin()`；在 `update()` 中通过 `frame(delta)` 判断是否运行；实现 `snapshot()` 返回可结构化克隆的数据；通过 `controls.consume()`/`down()` 读取输入、`publish()` 更新得分、`finish()` 结束本局。

Canvas 根据实际显示尺寸乘设备 DPR 分配渲染像素，摄像机缩放保持 manifest 的逻辑坐标不变；文字纹理也同步提高分辨率。容器尺寸、浏览器缩放和显示器 DPR 变化会自动刷新，退出时清理观察器。

## 存档与输入

IndexedDB `arcadehub` / `games` 以游戏 ID 保存本局分数、最高分、游戏快照和更新时间。最高分与快照在同一事务中更新。每 5 秒、暂停、离开游戏时自动保存；游戏结束保留最高分并清除可继续的快照。新游戏替换旧进度，保留历史最高分。异常或损坏快照不会直接恢复。清除站点数据会清除存档，设备间不自动同步；意外关闭可能丢失最近约 5 秒的进度。

键盘支持方向键/WASD、P/Esc 暂停；俄罗斯方块增加 Space 落底。触屏按钮由各游戏 manifest 声明。手柄支持方向键/左摇杆、A 对应向上或旋转、B 落底、Start 暂停。窗口失焦或隐藏自动暂停。音量与静音设置保存在 localStorage，音效资源随应用分发。

## 离线行为

首次联网打开生产版本并完成 Service Worker 安装后，所有构建产物（包括尚未打开过的游戏 chunk）缓存完成，侧栏显示“已准备好离线游玩”。之后离线刷新或打开另一游戏都不需要网络。开发模式不注册 Service Worker。新版本会等待旧页面关闭后生效，避免运行中的旧页面读取到被删掉的 chunk。

首版没有登录、后端、联机、排行榜、复杂 3D。Breakout、Tank、本地用户资料、成就、统计、皮肤、模拟器和 Replay 按计划后续推进。

## Flappy Bird

空格、↑、W、点击/轻触 Canvas 或屏幕“振翅”按钮均可开始飞行及振翅。等待输入期间不会下坠；穿过一组管道计 1 分，撞管道或地面结束。支持暂停、恢复、自动存档和最高纪录，以及现有的网页/浏览器全屏与 DPR 渲染。像素贴图使用最近邻采样，避免放大后模糊。

资源来自 [samuelcust/flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets)，版本与 MIT 许可保存在游戏 assets 目录，生产产物附带 `licenses/flappy-bird.txt`。原始振翅、得分、撞击、死亡、开始音效随游戏一起分发，遵循全局音量和静音设置；离线缓存包含这些资源。
