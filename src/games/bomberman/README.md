# Bomberman Clone

移植自 [danielcspaiva/Bomberman-Clone](https://github.com/danielcspaiva/Bomberman-Clone)，固定版本 `63e2838212227bbcdcb6aa6f6b19c550987bd449`。保留原版两张地图、随机砖块、角色/敌人素材、状态栏、音效、单人击杀模式及双人对战。原碰撞、敌人移动和绘制代码位于 `vendor/runtime.js`；没有 iframe、独立 DOM 键盘监听或额外游戏循环。

方向键选择模式，Enter / A 开始。P1 方向键 + Space，P2 WASD + Q；单人也支持 WASD + Q。P / Esc 暂停。虚拟手柄 A 放炸弹/开始，B 切换菜单模式，控制 P1；本地双人使用同一键盘。实体手柄 A 放炸弹，B 切换菜单，Start 开始，Back 暂停。

Phaser 固定 60 Hz 驱动逻辑，暂停时炸弹和爆炸计时停止。存档保存地图、角色、敌人、升级、击杀数、炸弹及爆炸剩余时间，恢复前验证；输入按住状态不保存。离开和重开不遗留定时器或声音。中英文文字跟随平台语言。

修复上游单人 WASD/Q 引用空玩家、重开依赖刷新页面、双人胜者写反、炸弹计时不受暂停控制及任一爆炸清除全部火焰的问题；砖块阻挡爆炸传播，速度上限为每帧 10 像素，防止穿墙。其余保留原版 100 点生命和持续伤害规则、2.3 秒引信、0.45 秒火焰、最长三格爆炸、80% 敌人掉落道具；不添加原版没有的连锁引爆、关卡系统或联机。

上游原 README 保存在 `vendor/UPSTREAM-README.md`；资源来源和校验值见 `assets/SOURCE.json`，权利声明见 `assets/NOTICE.txt`，构建生成 `licenses/bomberman-notice.txt`。原项目未提供独立开源许可证，且声明素材/音乐不属于作者；未确认商业再分发授权。
