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
    const cached = new Map<string, { redirected: boolean; path: string }>();
    const cache = {
      async addAll(urls: string[]) {
        for (const url of urls) {
          cached.set(url, { redirected: url === '/index.html', path: url });
        }
      },
      async match(request: string | { url: string }) {
        return cached.get(
          typeof request === 'string' ? request : new URL(request.url).pathname,
        );
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
    for (const path of ['/', '/game/snake', '/game/pong']) {
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
      await expect(response).resolves.toEqual({
        redirected: false,
        path: '/',
      });
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
