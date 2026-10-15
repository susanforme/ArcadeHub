# 经典弹珠台 / Classic Pinball

三球制原生 Phaser 插件：发射道、双挡板、三个撞柱、三枚目标灯、两侧弹射斜轨与漏球重发。点亮所有目标得 1000 奖励，并开启 15 秒双倍得分。球数耗尽后重开，平台记录最高分。

左右方向键/A/D 控制挡板，Space/Enter 发射，P/Esc 暂停。触屏可同时按住左右两侧控制挡板，点画面中央发射按钮，或使用虚拟手柄。失败后点按钮或 Enter 重开。

## 素材与实现

按 ASSETS.md 检索社区，采用 [rounddroid / 2D pinball sprites](https://opengameart.org/content/2d-pinball-sprites) 的 CC0 弹珠、挡板、撞柱、墙体 PNG。来源和直接文件地址保存在 [assets/NOTICE.txt](./assets/NOTICE.txt)。封面组合真实 sprite，场景染色增强可读性。球台为本项目布局，不冒充某一商业机台原版。

物理使用不大于 1/240 秒子步和 1250 像素/秒限速；弹珠每步移动小于半径，以避免高速穿过薄轨道。挡板碰撞考虑转动表面速度，圆形撞柱设置计分冷却，回落发射道的球会重新准备发射，不扣球。没有加入新运行时依赖。无多球、摇台或立体球台。

SessionScene 提供暂停、自动保存、离开保存、继续、重开和声音设置。快照保存位置、速度、挡板角度、球数、目标灯和双倍时间，恢复前验证所有状态。失败快照清空。

## 验证

`bun run test tests/pinball.test.ts` 覆盖出发射道、高速薄墙碰撞、挡板回击、撞柱计分冷却、目标灯奖励/双倍、三次漏球失败和 JSON 恢复确定性。另外用无操作和交替挡板长跑回归验证不会卡在护板夹缝或发射道。桌面浏览器实际验证了发射、鼠标右挡板、撞柱得分、P 暂停、刷新继续后的球数/目标灯/分数保留。截图位于 `/tmp/arcade-pinball-active.png`、`/tmp/arcade-pinball-paused.png` 与 `/tmp/arcade-pinball-restored.png`。真机触屏与长时间人类手感测试未完成。
