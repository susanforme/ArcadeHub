# 小朋友下楼梯 / NS-SHAFT

原生 Phaser 游戏插件，接入 ArcadeHub 的暂停、保存、继续、重开、音量、中英界面和虚拟手柄。

- 左右移动下落；没有主动跳跃键。
- 普通、尖刺、左右传送带、弹簧、翻转共六种平台。
- 10 格体力；普通平台恢复 1 格，尖刺和顶棚伤害 3 格；顶棚伤害有保护时间。
- 平台持续上移，随着地下层数提高速度；坠出画面或体力耗尽结束。
- 平台使用带种子的随机序列，存档保留位置、体力、平台状态和随机序列。
- 键盘方向键或 A/D 移动，Enter/Space 开始，P/Esc 暂停。触屏按住画面左右区域，或使用平台虚拟手柄。

## 资源与还原范围

角色、墙壁、顶棚、平台动画及受伤/弹跳音效来自社区 [NS-Shaft-Tutorial](https://github.com/mitty-fun/NS-Shaft-Tutorial)，固定版本与权利说明见 [assets/NOTICE.txt](./assets/NOTICE.txt)。上游未提供素材授权文件，不能将这些图像描述为 CC0 或 ArcadeHub 原创。

NS-SHAFT 本身是随机生成的无尽下落游戏，没有固定关卡包。本实现还原经典核心和原风格图像，重新实现时间步进、碰撞和平台序列；速度曲线、画面尺寸与原版程序并非逐帧一致。当前为单人模式。

## 验证

```sh
bun run test tests/ns-shaft.test.ts
bunx biome check src/games/ns-shaft tests/ns-shaft.test.ts
bun run typecheck
```

聚焦测试覆盖等待开始、平台承载、存档随机序列恢复、尖刺单次伤害、普通平台恢复、弹簧、翻转平台、顶棚保护时间及损坏存档拒绝。桌面浏览器已验证素材加载、移动、暂停、刷新后恢复；手机仍需真实设备验证。
