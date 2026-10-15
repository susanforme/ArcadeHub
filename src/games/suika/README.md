# 合成大西瓜 / Watermelon Merge

原生 Phaser 插件。11 种水果、前五种随机投放、同类接触合并、合并积分、下一颗预览、危险线与 2 秒溢出计时。键盘左右/A/D 调整位置，Space/Enter 投放；鼠标或触屏拖动后松开投放。P/Esc 和平台按钮暂停，失败后点按钮或 Enter 重开。

## 素材与参考

按 ASSETS.md 优先检索社区，水果图片来自 [kairess/suika-game](https://github.com/kairess/suika-game/tree/main/public/base)，其注明参考 [paulantoine2/suika](https://github.com/paulantoine2/suika)。保留 11 张社区原图，封面组合这些图片；未复制上游代码。准确版本与权利状态见 [assets/NOTICE.txt](./assets/NOTICE.txt)。上游未给出图片的明确许可，因此不能宣称这些素材具备商业再分发授权。

这是无固定关卡的投放合并玩法。新实现用小于等于 1/120 秒子步、8 次接触约束迭代、按面积分配碰撞质量；合并队列保证同一水果一次只能参与一个合并。最终西瓜不再合并；新投放物有 1.5 秒溢出宽限。物理是自定义圆形碰撞，不声称和任一商业原版逐帧一致。

会话使用 SessionScene 自动保存、离开保存与继续。快照包含水果位置/速度/年龄、随机状态、投放队列、冷却和溢出计时；恢复前验证版本、有限数、范围和唯一 id。暂停会清理触屏拖动，松手不会在恢复时误投。

## 验证

`bun run test tests/suika.test.ts` 覆盖三体合并去重、冷却/随机队列 JSON 恢复一致性、静止落地、投放宽限、溢出失败、最终水果上限与损坏存档。桌面浏览器实际验证了键盘/拖动投放、正确缩放坐标、P 暂停、刷新后的继续和水果快照保留。截图位于 `/tmp/arcade-suika-paused.png` 与 `/tmp/arcade-suika-restored.png`。没有真实手机手指验证。
