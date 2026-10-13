import { withRsbuildConfig } from '@rstest/adapter-rsbuild';
import { defineConfig } from '@rstest/core';

export default defineConfig({
  extends: withRsbuildConfig(),
  environment: 'happy-dom',
  setupFiles: ['./tests/rstest.setup.ts'],
});
