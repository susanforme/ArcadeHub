# ArcadeHub · Web Game Center

基于 Rsbuild 2、React、TypeScript、Phaser 4.2.1 的纯前端游戏插件平台。包含贪吃蛇、俄罗斯方块、Flappy Bird、小恐龙跑酷、2048、吃豆人、坦克大战，以及游戏大厅、详情、动态加载、IndexedDB 存档、音效和设置。无账号、无后端。

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

生产构建通过 jsDelivr 加载 Howler 2.2.4、Phaser 4.2.1、React / React DOM 19.3.0（包括 JSX runtime 和 client 子路径），不再将这些包打入本地 JS。开发模式仍使用本地依赖。CDN 地址集中在 `scripts/cdn.ts`，import map 将 React DOM 引用的 React 范围地址统一到固定版本；Service Worker 同时缓存 CDN 模块及 Scheduler，首次加载和缓存需要能访问 jsDelivr。

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
  virtualGamepad: {
    directions: ['LEFT', 'RIGHT'],
    buttons: [{ id: 'A', action: 'UP', label: '跳跃' }],
  },
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

键盘支持方向键/WASD、P/Esc 暂停；俄罗斯方块增加 Space 落底。虚拟手柄由各游戏 manifest 的 `virtualGamepad` 声明，触屏设备默认显示，也可通过工具栏显示或隐藏。手柄支持方向键/左摇杆、A 对应向上或旋转、B 落底、Start 暂停。窗口失焦或隐藏自动暂停。音量与静音设置保存在 localStorage，音效资源随应用分发。

## 公用虚拟手柄

`VirtualGamepad` 在 React 中绘制十字方向键与 A/B 操作键，直接接入当前会话的 `InputManager`。按钮身份与游戏动作分开：例如俄罗斯方块 A 映射 `UP`（旋转），B 映射 `DROP`（落底）；坦克 A 映射 `DROP`（开火/菜单确认）。未声明的按钮不显示，方向键可以只配置需要的方向。旧 `touchControls` 字段保留兼容类型，新的手柄界面使用 `virtualGamepad`。

```ts
virtualGamepad: {
  directions: ['UP', 'DOWN', 'LEFT', 'RIGHT'],
  directionMode: 'four-way',
  buttons: [
    { id: 'A', action: 'UP', label: '旋转', color: '#d94059' },
    { id: 'B', action: 'DROP', label: '落底' },
  ],
  opacity: 0.65,
  layout: {
    portrait: {
      dpad: { anchor: 'bottom-left', x: 16, y: 16, size: 132 },
      A: { anchor: 'bottom-right', x: 92, y: 64, size: 60 },
      B: { anchor: 'bottom-right', x: 16, y: 16, size: 60 },
    },
    landscape: {
      dpad: { anchor: 'bottom-left', x: 24, y: 24, size: 144 },
      A: { anchor: 'bottom-right', x: 104, y: 72, size: 64 },
      B: { anchor: 'bottom-right', x: 24, y: 24, size: 64 },
    },
  },
}
```

所有现有游戏都将手柄绝对定位覆盖在游戏区域两侧，不占用布局空间，Canvas 继续使用完整游戏区域。

横竖屏位置按视口方向切换，位置相对于游戏区域。方向键整体、A、B 可以分别锚定四个角，`x/y/size` 为 CSS 像素，自动叠加对应边缘安全区；缺省位置使用公用默认值。按钮建议至少 44px；方向区建议至少 132px。`opacity` 范围为 0～1，仅影响正常状态的按钮背景，按下时高亮。游戏配置属于源码，不接受外部运行时数据。

默认 `four-way` 同时只输出一个方向，多指操作方向键时最近操作优先；`eight-way` 允许组合方向。方向区可以滑动换向，中心死区或滑出范围释放方向，手指回来可以继续输入。方向与动作按钮支持同时按住，多个手指操作同一动作时最后一个释放才松开。游戏用 `consume(action)` 读取一次按下，用 `down(action)` 查询持续按住；长按重复、开火频率和跳跃高度由游戏规则决定。

Pointer Events 统一处理触屏、鼠标和触笔，指针捕获处理按钮外抬手；取消、失去捕获、窗口失焦、切后台、暂停、重开、隐藏及退出时清理相应输入。旋转屏幕时释放手柄输入。键盘、虚拟手柄、Canvas 和实体手柄保持独立来源，保留原有 `press(action)` / `release(action)` 调用，也可传第二个 `source` 参数。暂停后实体手柄仍按住的动作需先释放再按下。Canvas 原有点击、滑动操作继续保留。按钮支持 Enter/Space 与辅助技术点击，动画尊重减少动态效果设置。

实现参考 [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) 的捕获、取消与 `touch-action` 用法，以及 [React useEffect](https://react.dev/reference/react/useEffect) 的订阅清理方式，没有新增依赖。

## 离线行为

首次联网打开生产版本并完成 Service Worker 安装后，所有构建产物（包括尚未打开过的游戏 chunk）缓存完成，侧栏显示“已准备好离线游玩”。之后离线刷新或打开另一游戏都不需要网络。开发模式不注册 Service Worker。新版本会等待旧页面关闭后生效，避免运行中的旧页面读取到被删掉的 chunk。

首版没有登录、后端、联机、排行榜、复杂 3D。Breakout、Tank、本地用户资料、成就、统计、皮肤、模拟器和 Replay 按计划后续推进。

## Flappy Bird

空格、↑、W、点击/轻触 Canvas 或屏幕“振翅”按钮均可开始飞行及振翅。等待输入期间不会下坠；穿过一组管道计 1 分，撞管道或地面结束。支持暂停、恢复、自动存档和最高纪录，以及现有的网页/浏览器全屏与 DPR 渲染。像素贴图使用最近邻采样，避免放大后模糊。

资源来自 [samuelcust/flappy-bird-assets](https://github.com/samuelcust/flappy-bird-assets)，版本与 MIT 许可保存在游戏 assets 目录，生产产物附带 `licenses/flappy-bird.txt`。原始振翅、得分、撞击、死亡、开始音效随游戏一起分发，遵循全局音量和静音设置；离线缓存包含这些资源。

## 小恐龙跑酷

使用 Phaser 4.2.1 复刻 T-Rex Runner，采用 [wayou/t-rex-runner](https://github.com/wayou/t-rex-runner) 的原始 2× 精灵图、跳跃/撞击/里程音效，以及原版的碰撞形状与速度参数。源码记录了来源 commit 和 BSD 许可，构建产物附带 `licenses/t-rex-runner.txt`。

空格、↑、W、点击或轻触可开始/跳跃；按住跳得更高，松开短跳；↓ 或 S 俯身，空中按下可快速落地。障碍包括不同大小的仙人掌组，以及速度达到门槛后出现的不同高度翼龙。速度逐渐加快，每 100 分播放里程音效，每 700 分切换夜景 12 秒。支持本地进度、最高纪录、暂停、原有全屏、小屏、DPR 和离线运行。

## 2048

通过现有 Phaser 4 插件实现，使用 Graphics、Text 和 Tween 绘制棋盘、移动/合并动画及胜利界面，没有引入原版的 HTML 页面或 DOM 渲染器。参考 [gabrielecirulli/2048](https://github.com/gabrielecirulli/2048) 的规则与配色，保留 MIT 许可。

方向键/WASD、手柄方向键、屏幕按钮或在棋盘上滑动均可操作。相同数字每步最多合并一次；只在有效移动后生成一个新方块，90% 为 2，10% 为 4。合成 2048 后可继续挑战；无可用方向时结束。沿用平台全屏、小屏、DPR、暂停、音效设置、最高纪录、IndexedDB 进度存档和离线缓存。存档保存已经提交的棋盘状态，动画过程不会损坏进度。

## 吃豆人 Pac-Man

使用 Phaser 4.2.1 复刻经典模式，参考 [masonicGIT/pacman](https://github.com/masonicGIT/pacman) 的 28 × 31 迷宫、244 颗豆子（含 4 颗能量豆）、幽灵目标与散开/追击规则。没有嵌入原版页面、原生 Canvas 渲染器或游戏循环。方向键/WASD、屏幕按钮、手柄和滑动转向，支持提前输入转弯和行进中掉头。

普通豆子 10 分、能量豆 50 分；能量期间吃幽灵依次得 200/400/800/1600 分，幽灵眼睛返回巢穴后重生。侧面隧道互通；3 条生命，10000 分赠送一次生命。吃掉 70/170 颗豆子时出现奖励水果；清空迷宫进入下一关，移动速度逐渐增加。复用全屏、小屏、DPR、暂停、音量设置、最高纪录及 IndexedDB 进度，存档包含剩余豆子、角色位置、生命、关卡和计时器。

保留原仓库 GPL-3.0 许可、来源 commit 和修改说明，生产构建附带 `licenses/pacman.txt` 及完整应用源码包 `sources/arcadehub.tar.gz`，游戏底部可直接打开。原版开始、死亡、吃幽灵、吃水果和加生命音效随游戏分发。当前实现聚焦经典模式，移动速度、幽灵出笼延时、转场及水果图形为近似实现；其他变体、Turbo、练习回放和过场动画不在本次范围内。

## 坦克大战

基于 [feichao93/battle-city](https://github.com/feichao93/battle-city) 的 MIT 引擎、35 个原版关卡、像素素材和音效，适配现有 Phaser 插件。支持单人和同屏双人、选关、六种道具及关卡结算。玩家 1 使用 WASD + J / Space，玩家 2 使用方向键 + /；单人也可使用方向键、触屏按钮和手柄。P / Esc 暂停。

存档保留当前关卡开局时的生命、分数与升级，继续时重新开始该关。此次未移植局域网联机、关卡编辑器、画廊和 AI 托管界面。来源版本与许可见 `src/games/battle-city/assets/README.md`；构建包含 `licenses/battle-city.txt`。
