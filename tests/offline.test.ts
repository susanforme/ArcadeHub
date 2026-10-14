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

const origin = 'https://arcade-game-hub.pages.dev';

type CachedPage = { redirected: boolean; path: string };

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'arcade-offline-'));
  let source: string;
  try {
    mkdirSync(join(directory, 'dist'));
    writeFileSync(join(directory, 'dist/index.html'), '<h1>ArcadeHub</h1>');
    execFileSync('bun', [resolve('scripts/build-offline.ts')], {
      cwd: directory,
    });
    source = readFileSync(join(directory, 'dist/sw.js'), 'utf8');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  const handlers: Record<string, (event: unknown) => void> = {};
  const cached = new Map<string, CachedPage>();
  const deleted: string[] = [];
  let downloads = 0;
  let failDownload = false;
  let network = true;
  let skipWaiting = false;
  let claimed = false;
  const cache = {
    async addAll(requests: Request[]) {
      downloads++;
      if (failDownload) throw new Error('Resource unavailable');
      for (const request of requests) {
        expect(request.cache).toBe('reload');
        const path = new URL(request.url).pathname;
        cached.set(path, { redirected: path === '/index.html', path });
      }
    },
    async match(request: string | { url: string }) {
      return cached.get(
        typeof request === 'string' ? request : new URL(request.url).pathname,
      );
    },
  };
  runInNewContext(source, {
    URL,
    Request: class {
      url: string;
      cache: RequestCache | undefined;
      constructor(url: string, options: RequestInit) {
        this.url = new URL(url, origin).href;
        this.cache = options.cache;
      }
    },
    self: {
      location: { origin },
      skipWaiting: async () => {
        skipWaiting = true;
      },
      clients: {
        claim: async () => {
          claimed = true;
        },
      },
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        handlers[type] = handler;
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['arcadehub-old', 'unrelated-cache'],
      delete: async (key: string) => deleted.push(key),
    },
    fetch: async () => {
      if (!network) throw new Error('Network unavailable');
      return { ok: true, path: '/latest', redirected: false };
    },
  });
  async function lifecycle(type: string) {
    let pending = Promise.resolve();
    handlers[type]({
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
  }
  async function message(type: string) {
    let reply: unknown;
    let pending = Promise.resolve();
    handlers.message({
      data: { type },
      ports: [{ postMessage: (value: unknown) => (reply = value) }],
      waitUntil: (promise: Promise<void>) => {
        pending = promise;
      },
    });
    await pending;
    return reply;
  }
  function navigation(path: string) {
    let response: Promise<CachedPage> | undefined;
    handlers.fetch({
      request: { method: 'GET', mode: 'navigate', url: `${origin}${path}` },
      respondWith: (promise: Promise<CachedPage>) => {
        response = promise;
      },
    });
    return response;
  }
  return {
    cached,
    deleted,
    lifecycle,
    message,
    navigation,
    get downloads() {
      return downloads;
    },
    get skipWaiting() {
      return skipWaiting;
    },
    get claimed() {
      return claimed;
    },
    set failDownload(value: boolean) {
      failDownload = value;
    },
    set network(value: boolean) {
      network = value;
    },
  };
}

test('installation and status checks never download offline assets; activation removes only old app caches', async () => {
  const worker = fixture();
  await worker.lifecycle('install');
  await worker.lifecycle('activate');
  expect(worker.skipWaiting).toBe(true);
  expect(worker.claimed).toBe(true);
  expect(worker.deleted).toEqual(['arcadehub-old']);
  expect(await worker.message('OFFLINE_STATUS')).toEqual({ ready: false });
  expect(worker.downloads).toBe(0);
  expect(worker.cached.size).toBe(0);
});

test('manual caching enables offline navigation without using redirected index.html; online navigation stays fresh', async () => {
  const worker = fixture();
  expect(await worker.message('CACHE_OFFLINE')).toEqual({ ready: true });
  expect(worker.downloads).toBe(1);
  expect(worker.cached.has('/index.html')).toBe(false);
  expect(await worker.message('OFFLINE_STATUS')).toEqual({ ready: true });
  await expect(worker.navigation('/')).resolves.toEqual({
    path: '/latest',
    ok: true,
    redirected: false,
  });
  worker.network = false;
  for (const path of ['/', '/game/snake', '/game/pong']) {
    await expect(worker.navigation(path)).resolves.toEqual({
      redirected: false,
      path: '/',
    });
  }
});

test('a failed download never reports ready and can be retried manually', async () => {
  const worker = fixture();
  worker.failDownload = true;
  expect(await worker.message('CACHE_OFFLINE')).toEqual({ error: true });
  expect(await worker.message('OFFLINE_STATUS')).toEqual({ ready: false });
  worker.network = false;
  await expect(worker.navigation('/')).rejects.toThrow('Network unavailable');
  worker.failDownload = false;
  expect(await worker.message('CACHE_OFFLINE')).toEqual({ ready: true });
  expect(worker.downloads).toBe(2);
});
