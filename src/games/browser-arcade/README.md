# Browser Games Phaser 移植

来源：[juliensimon/browser-games](https://github.com/juliensimon/browser-games)

固定版本：`8fd600823f42b081aa3d3b43ead48fb33d86c631`。

各游戏的 `vendor/engine.js` 从该版本的 game.js 适配，保留规则、实体和渲染。移除独立页面启动和 RAF 主循环，将输入监听替换为平台回调、音频输出与计时器替换为 SceneAudio、原版 localStorage 最高分替换为平台存档，并将文字绘制接入共享中英文适配器。Breakout 计时和矢量渲染闪烁使用逻辑时钟。Canvas 绘制进入 Phaser CanvasTexture，由共享 Scene 固定步长推进和管理生命周期。

SOURCE.json 的 SHA-256 记录未修改的上游文件来源，不是当前适配文件的校验值。cover.png 来自各游戏 screenshots/attract-screen.png。

原仓库没有提供独立开源许可证；原作者声明为教育用途的粉丝复刻，游戏商标归各自所有者。保留 UPSTREAM-README.md 和各游戏原有 README。
