import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cdnAssets } from './cdn';

async function filesAt(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesAt(join(directory, entry.name))
        : [join(directory, entry.name)],
    ),
  );
  return lists.flat();
}
const files = (await filesAt('dist')).filter(
  (file) => !file.endsWith('sw.js') && !file.endsWith('.map'),
);
const hash = createHash('sha256');
hash.update('offline-v3-manual');
for (const file of files.sort()) hash.update(await readFile(file));
hash.update(JSON.stringify(cdnAssets));
const cache = `arcadehub-${hash.digest('hex').slice(0, 12)}`;
// Cloudflare redirects /index.html; redirected responses cannot serve navigation.
const urls = [
  ...files.map((file) =>
    file === 'dist/index.html' ? '/' : `/${file.slice(5)}`,
  ),
  ...cdnAssets,
];
await writeFile(
  'dist/sw.js',
  `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('arcadehub-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
let caching;
self.addEventListener('message', event => {
  const port = event.ports[0];
  if (!port || !['OFFLINE_STATUS', 'CACHE_OFFLINE'].includes(event.data?.type)) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      if (event.data.type === 'CACHE_OFFLINE') {
        // addAll commits only when every resource succeeds; '/' is the ready marker.
        caching ||= cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' }))).finally(() => { caching = undefined; });
        await caching;
      }
      port.postMessage({ ready: !!(await cache.match('/')) });
    } catch {
      port.postMessage({ error: true });
    }
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || (new URL(event.request.url).origin !== self.location.origin && !ASSETS.includes(event.request.url))) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') {
      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        if (response.ok) return response;
        return (await cache.match('/')) || response;
      } catch (error) {
        const offline = await cache.match('/');
        if (offline) return offline;
        throw error;
      }
    }
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`,
);
console.log(`Offline cache prepared: ${urls.length} assets`);
