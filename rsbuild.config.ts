import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: { entry: { index: './src/main.tsx' } },
  output: {
    copy: [
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
  html: { title: 'ArcadeHub · 随时开玩', lang: 'zh-CN' },
});
