import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, test } from '@rstest/core';

test('offline navigation uses the canonical page, never the redirected index.html', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'arcade-offline-'));
  try {
    mkdirSync(join(directory, 'dist'));
    writeFileSync(join(directory, 'dist/index.html'), '<h1>ArcadeHub</h1>');
    execFileSync('bun', [resolve('scripts/build-offline.ts')], {
      cwd: directory,
    });
    const handlers: Record<string, (event: unknown) => void> = {};
    const cached = new Map<string, { redirected: boolean }>();
    const cache = {
      async addAll(urls: string[]) {
        for (const url of urls) {
          cached.set(url, { redirected: url === '/index.html' });
        }
      },
      async match(url: string) {
        return cached.get(url);
      },
    };
    runInNewContext(readFileSync(join(directory, 'dist/sw.js'), 'utf8'), {
      URL,
      self: {
        location: { origin: 'https://arcade-game-hub.pages.dev' },
        addEventListener: (type: string, handler: (event: unknown) => void) => {
          handlers[type] = handler;
        },
      },
      caches: { open: async () => cache },
      fetch: () => {
        throw new Error('Network unavailable');
      },
    });
    let installed: Promise<void> = Promise.resolve();
    handlers.install({
      waitUntil: (promise: Promise<void>) => {
        installed = promise;
      },
    });
    await installed;
    expect(cached.has('/index.html')).toBe(false);
    for (const path of ['/', '/game/snake']) {
      let response: Promise<{ redirected: boolean }> | undefined;
      handlers.fetch({
        request: {
          method: 'GET',
          mode: 'navigate',
          url: `https://arcade-game-hub.pages.dev${path}`,
        },
        respondWith: (promise: Promise<{ redirected: boolean }>) => {
          response = promise;
        },
      });
      await expect(response).resolves.toEqual({ redirected: false });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
