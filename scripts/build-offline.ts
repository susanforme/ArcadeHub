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
hash.update('offline-v2');
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
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('arcadehub-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || (new URL(event.request.url).origin !== self.location.origin && !ASSETS.includes(event.request.url))) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match(event.request)) || (await cache.match('/')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`,
);
console.log(`Offline cache prepared: ${urls.length} assets`);
