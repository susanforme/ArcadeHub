# 静态资源 CDN 方案（未启用）

## 当前决定

2026-10-15 排查发现，超限文件是构建脚本生成的 `sources/arcadehub.tar.gz`，约 34 MiB。Cloudflare Pages 限制的是**单文件最大 25 MiB**，不是整个 `dist` 必须小于 25 MiB。因此删除源码打包步骤，源码入口直接链接到仓库；图片、音视频、SVG 保持现有构建方式，无需为这次问题迁移 CDN。

现有 Howler、Phaser、React 等依赖的 npm CDN 配置继续保留。本文只记录将来可采用的素材 CDN 方法，不代表当前已实施。

本次删除源码包后重新构建：`dist` 共 449 个文件、约 39.71 MiB，最大单文件为 `fever.56f8311a87.mp3`，约 5.88 MiB；没有文件超过 25 MiB。此数据是本次本地构建结果，后续新增资源需重新检查。

参考：[Cloudflare Pages 文件大小限制](https://developers.cloudflare.com/pages/platform/limits/#file-size)。

## URL 映射

仅在生产环境，将资源映射为以下前缀加**相对于仓库根目录的原始路径**：

```text
https://cdn.jsdelivr.net/gh/susanforme/ArcadeHub@master/

src/games/sokoban/assets/player.png
→ https://cdn.jsdelivr.net/gh/susanforme/ArcadeHub@master/src/games/sokoban/assets/player.png

public/favicon.png
→ https://cdn.jsdelivr.net/gh/susanforme/ArcadeHub@master/public/favicon.png
```

路径中的空格等字符按路径段进行 URL 编码。开发环境继续使用本地资源；JS、CSS、字体不在此方案范围内。组件内直接绘制的 SVG 和 Canvas 图形也不属于外部资源文件。

## 构建处理

在 `rsbuild.config.ts` 中仅为生产构建启用资源插件，统一调整 Rsbuild 的 `image`、`media`、`svg` 规则：

1. 将普通导入、`?url` 和 `?inline` 分支统一设为 `asset/resource`，禁止自动 Base64 内联。保留 `?raw` 等源码导入语义。
2. 为这些规则设置 `generator.publicPath` 为上述 CDN 前缀，`generator.filename` 返回编码后的仓库原始路径，`generator.emit` 设为 `false`。
3. 保留现有业务中的 `import` 和 `import.meta.glob`；批量导入资源同样由构建规则处理，无需逐游戏修改 URL。
4. 单独将 HTML favicon 指向 `public/favicon.png` 的 CDN URL，并停止复制该文件。其他直接引用 `public` 文件的 URL 也需逐项处理，不能只依赖模块规则。

不要只设置全局 `output.assetPrefix`：它同时影响 JS/CSS 等资源，而且默认仍引用构建后的 hash 文件路径，不能直接对应 GitHub 仓库中的原始文件。

参考：[Rsbuild assetPrefix](https://rsbuild.rs/config/output/asset-prefix)、[Rspack 资源生成选项](https://rspack.rs/config/module-generator)。

## 离线缓存

素材不再输出到 `dist` 后，`scripts/build-offline.ts` 仅遍历构建目录将无法发现它们。需要同时完成以下调整：

- 构建插件收集实际使用的 CDN 资源，生成 `cdn-assets.json`，每项记录 `url` 与源文件内容摘要 `revision`。
- 将这些 URL 加入 Service Worker 的 `ASSETS`，使手动缓存和断网读取覆盖跨域素材。
- 将清单及内容摘要纳入缓存版本计算。`@master` URL 在修改文件后不变，仅对 URL 做 hash 会继续命中旧素材缓存。
- 验证 CDN 响应允许跨域读取；任意资源请求失败时，不应报告离线包准备完成。

## 发布与验证

素材必须先推送到远端 `master`，否则本地构建成功仍可能请求到不存在或较旧的文件。jsDelivr 的分支缓存为 12 小时；若需要页面代码和素材严格对应同一版本，可将 `@master` 换成构建对应的 commit SHA。参考：[jsDelivr GitHub 用法与缓存](https://github.com/jsdelivr/jsdelivr#github)。

实施后需检查构建结果不再输出目标媒体文件，也没有意外的 Base64 资源；在浏览器验证大厅图片、Phaser 图片与音频、带空格的文件名、手动离线缓存及素材更新后换版。最后检查 `dist` 的每个文件大小，确认没有超过 25 MiB 的文件。
