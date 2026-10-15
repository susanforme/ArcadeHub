import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { cdnImports, cdnModules } from './scripts/cdn';

export default defineConfig(({ envMode }) => ({
  plugins: [pluginReact()],
  source: { entry: { index: './src/main.tsx' } },
  output: {
    externals:
      envMode === 'production'
        ? Object.fromEntries(
            Object.entries(cdnModules).map(([name, url]) => [
              name,
              `import ${url}`,
            ]),
          )
        : undefined,
    copy: [
      ...[
        'magic-tower',
        'feeding-frenzy',
        'insaniquarium',
        'ski-free',
        'dig-dug',
        'ice-climber',
        'suika',
        'pinball',
      ].flatMap((id) => [
        {
          from: `./src/games/${id}/README.md`,
          to: `licenses/${id}/README.md`,
        },
        {
          from: `./src/games/${id}/assets/{LICENSE*,License*,license*,NOTICE*,SOURCE*}`,
          to: `licenses/${id}/[name][ext]`,
          noErrorOnMissing: true,
        },
        {
          from: `./src/games/${id}/SOURCE.json`,
          to: `licenses/${id}/SOURCE.json`,
          noErrorOnMissing: true,
        },
      ]),
      ...[
        'ns-shaft',
        'color-lines',
        'hextris',
        'klondike',
        'dr-mario',
        'lode-runner',
        'pang',
      ].map((id) => ({
        from: `./src/games/${id}/assets/NOTICE.txt`,
        to: `licenses/${id}/NOTICE.txt`,
      })),
      {
        from: './src/games/hextris/assets/LICENSE.md',
        to: 'licenses/hextris/LICENSE.md',
      },
      {
        from: './src/games/color-lines/assets/COPYING',
        to: 'licenses/color-lines/COPYING',
      },
      {
        from: './src/games/color-lines/assets/LICENSE-reference',
        to: 'licenses/color-lines/LICENSE-reference',
      },
      {
        from: './src/games/pang/assets/COPYING',
        to: 'licenses/pang/COPYING',
      },
      {
        from: './src/games/puyo-puyo/assets/NOTICE.txt',
        to: 'licenses/puyo-puyo-notice.txt',
      },
      {
        from: './src/games/snow-bros/assets/SOURCES.md',
        to: 'licenses/snow-bros-sources.md',
      },
      {
        from: './src/games/zuma/assets/SOURCES.md',
        to: 'licenses/zuma-sources.md',
      },
      {
        from: './src/games/puzzle-bobble/assets/SOURCES.md',
        to: 'licenses/puzzle-bobble-sources.md',
      },
      {
        from: './src/games/fruit-ninja/assets/NOTICE.txt',
        to: 'licenses/fruit-ninja-notice.txt',
      },
      {
        from: './src/games/whack-a-mole/assets/LICENSE.txt',
        to: 'licenses/whack-a-mole.txt',
      },
      {
        from: './src/app/assets/OFL-NotoSansSC.txt',
        to: 'licenses/noto-sans-sc.txt',
      },
      {
        from: './src/games/brotato/assets/*.txt',
        to: 'licenses/brotato/[name][ext]',
      },
      {
        from: './src/games/minesweeper/assets/*.txt',
        to: 'licenses/minesweeper/[name][ext]',
      },
      {
        from: './src/games/carrot-fantasy/assets/NOTICE.txt',
        to: 'licenses/carrot-fantasy-notice.txt',
      },
      {
        from: './src/games/cut-the-rope/assets/*.txt',
        to: 'licenses/cut-the-rope/[name][ext]',
      },
      {
        from: './src/games/sokoban/collections',
        to: 'levels/sokoban',
      },
      {
        from: './src/games/sokoban/assets/LICENSE',
        to: 'licenses/sokoban.txt',
      },
      {
        from: './src/games/bomberman/assets/NOTICE.txt',
        to: 'licenses/bomberman-notice.txt',
      },
      {
        from: './src/games/metal-slug/assets/NOTICE.txt',
        to: 'licenses/metal-slug-notice.txt',
      },
      {
        from: './src/games/battle-city/assets/LICENSE',
        to: 'licenses/battle-city.txt',
      },
      { from: './src/games/pacman/assets/LICENSE', to: 'licenses/pacman.txt' },
      { from: './src/games/2048/assets/LICENSE', to: 'licenses/2048.txt' },
      {
        from: './src/games/flappy-bird/assets/LICENSE',
        to: 'licenses/flappy-bird.txt',
      },
      {
        from: './src/games/t-rex-runner/assets/LICENSE',
        to: 'licenses/t-rex-runner.txt',
      },
    ],
  },
  html: {
    title: 'ArcadeHub · 随时开玩',
    lang: 'zh-CN',
    tags:
      envMode === 'production'
        ? [
            {
              tag: 'script',
              head: true,
              append: false,
              attrs: { type: 'importmap' },
              children: JSON.stringify({ imports: cdnImports }),
            },
          ]
        : [],
  },
}));
