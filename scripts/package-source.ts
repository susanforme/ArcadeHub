import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

// Ship corresponding source alongside the GPL Pac-Man adaptation, including its platform dependencies.
await mkdir('dist/sources', { recursive: true });
execFileSync(
  'tar',
  [
    '-czf',
    'dist/sources/arcadehub.tar.gz',
    'src',
    'scripts',
    'tests',
    'package.json',
    'bun.lock',
    'README.md',
    'rsbuild.config.ts',
    'rstest.config.ts',
    'tsconfig.json',
    'biome.json',
  ],
  { env: { ...process.env, LC_ALL: 'C', COPYFILE_DISABLE: '1' } },
);
