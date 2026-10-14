# Metal Slug / Gem Slug Phaser 移植

来源：[giacoballoccu/MetalSlugClone](https://github.com/giacoballoccu/MetalSlugClone)，固定版本 `541c189ec7db03bbc588144926904a8ba3b81bae`。上游是 Unity 2018.3.8f1 工程，本插件使用 Phaser 原生 Scene 和纯 TypeScript 固定 60 Hz 规则重写，没有 iframe、独立 DOM 游戏循环或 Unity 运行时。

## 已接入

- 原版 Marco 上下半身动画、士兵、巨蟹、直升机、Huge Ermit、UFO 和 Sol Dae Rokker Boss 贴图及爆炸动画。
- 海滩、夜间残骸、神庙三个主题关卡，每关沿横轴推进，击败 Boss 后进入下一关，三关完成后结算。
- 左右移动、跳跃/平台落地、向上瞄准、下蹲、手枪、重机枪、近身攻击、抛物线手雷、范围伤害、拾取补给、生命及短暂无敌时间。
- Boss 分别使用瞄准炮弹、延时标记落石和扇形弹幕；半血加速（落石 Boss 保留固定节奏）。
- 键盘 J/X 射击，Space/K 跳跃，L/C 手雷，方向键/WASD 移动/瞄准/下蹲；实体手柄 0 跳跃、1 射击、2 手雷；虚拟手柄 A 射击、B 跳跃、X 手雷。
- 沿用平台暂停、失焦暂停、重开、最高分、全局音量、中英切换、全屏、DPR、IndexedDB 和离线资源生成。
- 存档包含关卡、生命、补给、敌人血量和位置、投射物、冷却及转场计时；非法/过期/结束存档退回新游戏。

## 与 Unity 原版的差异

这是复用原素材的玩法重写，不是 Unity 场景的一比一转换。关卡长度、地面/平台、敌人组合、补给位置和 Boss 攻击重新编排。没有移植原场景的事件触发链、乘船、水下、坍塌桥梁、变身、可驾驶载具、NPC 救援、难度菜单、背景音乐及过场演出；僵尸、蛆虫、毛虫与车辆敌人的独立行为也未实现。游戏详情中明确说明布局与 Boss 攻击为重新编排。

## 资源复现与来源

`assets/SOURCE.json` 记录原资源路径、SHA-256 和 commit，`assets/UPSTREAM-README.md` 保留上游说明。运行以下命令可重新生成 atlas、背景及音效（需要 Python/Pillow；应用构建不需要它们）：

```sh
python3 scripts/import-metal-slug.py /path/to/MetalSlugClone
```

原仓库没有根级开源许可证；没有为上游素材补写许可。来源及权利声明见 `assets/NOTICE.txt`，生产产物携带 `licenses/metal-slug-notice.txt`，资源和转换脚本也随平台源码包分发。
