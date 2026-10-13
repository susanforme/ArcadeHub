import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  source: { entry: { index: './src/main.tsx' } },
  output: {
    copy: [
      {
        from: './src/games/flappy-bird/assets/LICENSE',
        to: 'licenses/flappy-bird.txt',
      },
    ],
  },
  html: { title: 'ArcadeHub · 随时开玩', lang: 'zh-CN' },
});
