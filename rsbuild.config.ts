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
